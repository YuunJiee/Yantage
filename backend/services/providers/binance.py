import ccxt
import logging
from sqlalchemy.orm import Session

from .base import ExchangeProvider
from .common import sync_asset_balance
from ...constants import AssetCategory, Provider
from ...repositories.connection_repo import ConnectionRepository
from ...utils.icons import get_icon_for_ticker
from ..exchange_rate_service import get_usdt_twd_rate

logger = logging.getLogger(__name__)


class BinanceProvider(ExchangeProvider):
    def sync(self, db: Session) -> bool:
        logger.info("Starting Binance Sync...")

        connections = ConnectionRepository(db).list_active_by_provider(Provider.BINANCE.value)

        if not connections:
            logger.info("Binance Sync skipped: No active connections found.")
            return False

        success_count = 0

        for conn in connections:
            logger.info(f"Syncing Binance Connection: {conn.name}")
            if not conn.api_key or not conn.api_secret:
                logger.warning(f"  Skipping {conn.name}: Missing API Key/Secret")
                continue

            try:
                exchange = ccxt.binance({
                    'apiKey': conn.api_key,
                    'secret': conn.api_secret,
                    'enableRateLimit': True,
                })

                balance = exchange.fetch_balance()
                assets_found = {
                    coin: amount
                    for coin, amount in balance.get('total', {}).items()
                    if amount > 0
                }

                if not assets_found:
                    logger.info(f"  {conn.name}: No assets found.")
                else:
                    logger.info(f"  {conn.name}: Found {len(assets_found)} assets.")

                all_tickers = exchange.fetch_tickers()
                usdt_twd_rate = get_usdt_twd_rate(db)
                logger.info(f"  USDT/TWD Rate: {usdt_twd_rate}")

                clean_conn_name = conn.name.replace(' Connection', '').strip().capitalize()

                for coin, amount in assets_found.items():
                    current_price_usd = 1.0 if coin == 'USDT' else float(
                        all_tickers.get(f"{coin}/USDT", {}).get('last') or 0
                    )

                    sync_asset_balance(
                        db,
                        connection_id=conn.id,
                        ticker=coin,
                        target_name=f"{coin} ({clean_conn_name})",
                        current_price=current_price_usd,
                        source=Provider.BINANCE.value,
                        icon=get_icon_for_ticker(coin, AssetCategory.CRYPTO),
                        amount=amount,
                    )

                success_count += 1

            except Exception as e:
                logger.error(f"Binance Sync Exception for {conn.name}: {e}")

        return success_count > 0
