import requests
import logging
from sqlalchemy.orm import Session

from .base import ExchangeProvider
from .common import sync_asset_balance
from ...repositories.connection_repo import ConnectionRepository
from ...utils.hmac_signing import sign_pionex_request
from ...utils.icons import get_icon_for_ticker

logger = logging.getLogger(__name__)

BASE_URL = "https://api.pionex.com"


class PionexProvider(ExchangeProvider):
    def sync(self, db: Session) -> bool:
        logger.info("Starting Pionex Sync...")

        connections = ConnectionRepository(db).list_active_by_provider('pionex')

        if not connections:
            logger.info("Pionex Sync skipped: No active connections found.")
            return False

        success_count = 0

        for conn in connections:
            logger.info(f"Syncing Pionex Connection: {conn.name}")
            if not conn.api_key or not conn.api_secret:
                logger.warning(f"  Skipping {conn.name}: Missing API Key/Secret")
                continue

            try:
                path = "/api/v1/account/balances"
                headers, final_params = sign_pionex_request(conn.api_key, conn.api_secret, "GET", path)
                resp = requests.get(f"{BASE_URL}{path}", headers=headers, params=final_params)

                if resp.status_code != 200:
                    logger.error(f"Pionex API Error {resp.status_code}: {resp.text}")
                    continue

                data = resp.json()
                if not data.get('result', False):
                    logger.error(f"Pionex API Result False: {data}")
                    continue

                assets_found: dict[str, float] = {}
                for b in data.get('data', {}).get('balances', []):
                    total = float(b.get('free', 0)) + float(b.get('frozen', 0))
                    if total > 0:
                        assets_found[b.get('coin')] = total

                if not assets_found:
                    logger.info(f"  {conn.name}: No assets found.")
                else:
                    logger.info(f"  {conn.name}: Found {len(assets_found)} assets.")

                # Fetch market prices
                market_prices: dict[str, float] = {}
                try:
                    t_resp = requests.get(f"{BASE_URL}/api/v1/market/tickers")
                    if t_resp.status_code == 200:
                        t_data = t_resp.json()
                        if t_data.get('result', False):
                            for t in t_data.get('data', {}).get('tickers', []):
                                market_prices[t.get('symbol')] = float(t.get('close', 0))
                except Exception as e:
                    logger.error(f"Error fetching Pionex prices: {e}")

                clean_conn_name = conn.name.replace(' Connection', '').strip().capitalize()

                for ticker, amount in assets_found.items():
                    current_price = 1.0 if ticker == 'USDT' else market_prices.get(f"{ticker}_USDT", 0.0)

                    sync_asset_balance(
                        db,
                        connection_id=conn.id,
                        ticker=ticker,
                        target_name=f"{ticker} ({clean_conn_name})",
                        current_price=current_price,
                        source="pionex",
                        icon=get_icon_for_ticker(ticker, "Crypto"),
                        amount=amount,
                    )

                success_count += 1

            except Exception as e:
                logger.error(f"Pionex Sync Exception for {conn.name}: {e}")

        return success_count > 0
