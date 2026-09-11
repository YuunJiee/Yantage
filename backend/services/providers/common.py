from datetime import datetime

from sqlalchemy.orm import Session

from ... import schemas
from ...repositories.asset_repo import AssetRepository


def sync_asset_balance(
    db: Session,
    *,
    connection_id: int,
    ticker: str,
    target_name: str,
    current_price: float,
    source: str,
    icon: str,
    amount: float,
) -> None:
    """Find-or-create the Crypto asset for this connection+ticker, refresh its
    display fields, and write a balancing Transaction so its summed quantity
    matches ``amount``.

    Shared by binance.py and pionex.py, whose per-sync update rules are
    identical. MAX has different update rules (avg-cost tracking, TWD as a
    Fluid category, name never overwritten) and wallet.py has a different
    lookup key (network/contract-address, not ticker) plus two extra sync
    passes — both call AssetRepository directly instead of this helper
    rather than forcing those differences into shared parameters.
    """
    repo = AssetRepository(db)
    asset = repo.find_by_connection(connection_id, ticker=ticker)

    if asset:
        asset.last_updated_at = datetime.now()
        asset.name = target_name
        if current_price > 0:
            asset.current_price = current_price
        asset.sub_category = "Crypto"
        if asset.icon != icon:
            asset.icon = icon
        repo.record_balance_diff(asset, amount)
    else:
        asset = repo.create(schemas.AssetCreate(
            name=target_name, ticker=ticker, category="Crypto", sub_category="Crypto",
            source=source, icon=icon, include_in_net_worth=True,
            current_price=current_price if current_price > 0 else None,
            connection_id=connection_id,
        ))
        repo.create_transaction(
            schemas.TransactionCreate(amount=amount, buy_price=0, date=datetime.now(), is_transfer=False),
            asset.id,
        )
