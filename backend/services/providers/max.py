import requests
import logging
from datetime import datetime
from sqlalchemy.orm import Session

from .base import ExchangeProvider
from ... import schemas
from ...constants import AssetCategory, Provider
from ...repositories.asset_repo import AssetRepository
from ...repositories.connection_repo import ConnectionRepository
from ...utils.hmac_signing import sign_max_request
from ...utils.icons import get_icon_for_ticker

logger = logging.getLogger(__name__)

BASE_URL = "https://max-api.maicoin.com"


class MaxProvider(ExchangeProvider):
    def sync(self, db: Session) -> bool:
        logger.info("Starting MAX Sync...")

        connections = ConnectionRepository(db).list_active_by_provider(Provider.MAX.value)

        if not connections:
            logger.info("MAX Sync skipped: No active connections found.")
            return False

        repo = AssetRepository(db)
        success_count = 0

        for conn in connections:
            logger.info(f"Syncing MAX Connection: {conn.name} ({conn.id})")
            if not conn.api_key or not conn.api_secret:
                logger.warning(f"  Skipping {conn.name}: Missing API Key/Secret")
                continue

            try:
                path = "/api/v3/wallet/spot/accounts"
                headers, payload_data = sign_max_request(path, conn.api_key, conn.api_secret)
                query_params = {k: v for k, v in payload_data.items() if k != 'path'}
                resp = requests.get(f"{BASE_URL}{path}", headers=headers, params=query_params)

                if resp.status_code != 200:
                    logger.error(f"MAX API Error {resp.status_code}: {resp.text}")
                    continue

                active_balances = {
                    acc.get('currency', '').upper(): float(acc.get('balance', 0))
                    for acc in resp.json()
                    if float(acc.get('balance', 0)) > 0
                }

                if active_balances:
                    logger.info(f"  {conn.name}: Found {len(active_balances)} assets: {list(active_balances.keys())}")

                # Fetch prices
                market_prices: dict[str, float] = {}
                try:
                    markets = []
                    for ticker in active_balances:
                        if ticker == 'TWD':
                            pass
                        elif ticker == 'USDT':
                            markets.append("usdttwd")
                        else:
                            markets.append(f"{ticker.lower()}twd")
                    if markets:
                        pr = requests.get(
                            f"{BASE_URL}/api/v3/tickers",
                            params=[('markets[]', m) for m in markets],
                        )
                        if pr.status_code == 200:
                            for t in pr.json():
                                market_prices[t.get('market')] = float(t.get('last', 0))
                except Exception as e:
                    logger.error(f"Error fetching MAX prices: {e}")

                for ticker, amount in active_balances.items():
                    if ticker == 'TWD':
                        current_price = 1.0
                    else:
                        pair_key = "usdttwd" if ticker == 'USDT' else f"{ticker.lower()}twd"
                        current_price = market_prices.get(pair_key, 0.0)

                    target_icon = get_icon_for_ticker(
                        ticker, AssetCategory.CRYPTO if ticker != 'TWD' else AssetCategory.FLUID
                    )

                    db_asset = repo.find_by_connection(conn.id, ticker=ticker)

                    if db_asset:
                        if current_price > 0:
                            db_asset.current_price = current_price
                            db_asset.last_updated_at = datetime.now()
                        if ticker != 'TWD':
                            db_asset.sub_category = "Crypto"
                        if db_asset.icon != target_icon:
                            db_asset.icon = target_icon

                        repo.record_balance_diff(db_asset, amount)
                    else:
                        logger.info(f"  Creating new MAX asset: {ticker}")
                        category     = AssetCategory.FLUID if ticker == 'TWD' else AssetCategory.CRYPTO
                        sub_category = "Cash"   if ticker == 'TWD' else "Crypto"
                        new_asset = repo.create(schemas.AssetCreate(
                            name=f"{ticker} ({conn.name})",
                            ticker=ticker, category=category, sub_category=sub_category,
                            source=Provider.MAX.value, icon=target_icon, include_in_net_worth=True,
                            current_price=current_price,
                            connection_id=conn.id,
                        ))
                        repo.create_transaction(
                            schemas.TransactionCreate(amount=amount, buy_price=0, date=datetime.now(), is_transfer=False),
                            new_asset.id,
                        )

                success_count += 1

            except Exception as e:
                logger.error(f"MAX Sync Exception for {conn.name}: {e}")

        return success_count > 0
