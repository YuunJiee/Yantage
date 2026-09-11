import time
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from web3 import Web3

from .base import ExchangeProvider
from .wallet_config import ERC20_ABI, NETWORKS, POPULAR_TOKENS
from ... import schemas
from ...repositories.asset_repo import AssetRepository
from ...repositories.connection_repo import ConnectionRepository
from ...utils.icons import get_icon_for_ticker
from ..price_service import fetch_crypto_price

logger = logging.getLogger(__name__)

_BALANCE_EPSILON = 1e-6


class WalletProvider(ExchangeProvider):
    def sync(self, db: Session) -> bool:
        logger.info("Starting Wallet Sync (Multi-Connection)...")

        connections = ConnectionRepository(db).list_active_by_provider('wallet')

        if not connections:
            logger.info("Wallet Sync skipped: No active wallet connections found.")
            return False

        repo = AssetRepository(db)
        web3_instances: dict[str, Web3] = {}

        for conn in connections:
            logger.info(f"Syncing Wallet: {conn.name} ({conn.address})")
            if not conn.address:
                continue

            try:
                checksum_address = Web3.to_checksum_address(conn.address)
            except ValueError:
                logger.error(f"  Invalid address: {conn.address}")
                continue

            for network in ['Ethereum', 'Scroll', 'BSC', 'Arbitrum']:
                if network not in web3_instances:
                    rpc = NETWORKS.get(network)
                    w3 = Web3(Web3.HTTPProvider(rpc)) if rpc else None
                    if w3 and w3.is_connected():
                        web3_instances[network] = w3
                    else:
                        logger.warning(f"  Failed to connect to {network}")
                        continue

                w3 = web3_instances[network]
                clean_conn_name = conn.name.replace(' Connection', '').strip().capitalize()

                # A. Native token
                try:
                    balance_wei = w3.eth.get_balance(checksum_address)
                    balance_fmt = float(balance_wei) / 1e18
                    native_ticker = "ETH" if network in ('Ethereum', 'Scroll', 'Arbitrum') else "BNB"
                    asset_name = f"{native_ticker} ({clean_conn_name})"

                    db_asset = repo.find_by_connection(conn.id, network=network, contract_address_is_null=True)

                    if db_asset:
                        db_asset.last_updated_at = datetime.now()
                        repo.record_balance_diff(db_asset, balance_fmt, epsilon=_BALANCE_EPSILON)
                    elif balance_fmt > 0:
                        new_asset = repo.create(schemas.AssetCreate(
                            name=asset_name, ticker=native_ticker,
                            category="Crypto", sub_category="Crypto",
                            source="web3_wallet", include_in_net_worth=True,
                            network=network, connection_id=conn.id, decimals=18,
                        ))
                        repo.create_transaction(
                            schemas.TransactionCreate(amount=balance_fmt, buy_price=0, date=datetime.now()),
                            new_asset.id,
                        )
                except Exception as e:
                    logger.error(f"  Error syncing native on {network}: {e}")

                # B. Known token assets
                token_assets = repo.list_by_connection(conn.id, network=network, contract_address_is_null=False)
                tracked_contracts = {a.contract_address.lower() for a in token_assets if a.contract_address}

                for asset in token_assets:
                    try:
                        contract = w3.eth.contract(
                            address=Web3.to_checksum_address(asset.contract_address), abi=ERC20_ABI
                        )
                        bal = contract.functions.balanceOf(checksum_address).call()
                        bal_fmt = float(bal) / (10 ** (asset.decimals or 18))
                        repo.record_balance_diff(
                            asset, bal_fmt, epsilon=_BALANCE_EPSILON, touch_last_updated_on_write=True
                        )
                    except Exception as e:
                        logger.error(f"    Error syncing token {asset.ticker}: {e}")

                # C. Auto-discovery of popular tokens
                if network in POPULAR_TOKENS:
                    for token in POPULAR_TOKENS[network]:
                        if token['address'].lower() in tracked_contracts:
                            continue
                        time.sleep(0.1)
                        try:
                            contract = w3.eth.contract(
                                address=Web3.to_checksum_address(token['address']), abi=ERC20_ABI
                            )
                            bal = contract.functions.balanceOf(checksum_address).call()
                            if bal <= 0:
                                continue
                            decimals = token.get('decimals', 18)
                            bal_fmt = float(bal) / (10 ** decimals)
                            if bal_fmt <= 0:
                                continue

                            logger.info(f"  FOUND NEW: {token['symbol']} on {network} ({bal_fmt})")
                            target_icon = get_icon_for_ticker(token['symbol'], "Crypto")
                            ticker = f"{token['symbol']}-USD"
                            current_price = None
                            try:
                                price = fetch_crypto_price(ticker)
                                if price > 0:
                                    current_price = price
                            except Exception as e:
                                logger.error(f"Failed to fetch initial price for {token['symbol']}: {e}")

                            new_asset = repo.create(schemas.AssetCreate(
                                name=token['symbol'], ticker=ticker,
                                category="Crypto", sub_category="Token",
                                source="web3_wallet", include_in_net_worth=True,
                                network=network, connection_id=conn.id,
                                contract_address=token['address'],
                                decimals=decimals, icon=target_icon,
                                current_price=current_price,
                            ))
                            repo.create_transaction(
                                schemas.TransactionCreate(amount=bal_fmt, buy_price=0, date=datetime.now()),
                                new_asset.id,
                            )
                            tracked_contracts.add(token['address'].lower())
                        except Exception:
                            pass

        return True
