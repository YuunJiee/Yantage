import csv
import io

from sqlalchemy.orm import Session

from ..repositories.system_repo import SystemRepository
from .asset_service import AssetService
from .price_service import update_prices
from .snapshot_service import snapshot_net_worth

CSV_HEADER = ['ID', 'Name', 'Ticker', 'Category', 'Sub-Category', 'Source', 'Quantity', 'Current Price', 'Value (approx)', 'Include in NW']


def build_assets_csv(db: Session) -> str:
    """'Value (approx)' reuses AssetService's value_twd — the same
    TWD-converted figure shown everywhere else in the app — instead of a
    separate native-currency formula (see docs/specs/assets-transactions.md
    Decision 6)."""
    assets = AssetService(db).list_all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(CSV_HEADER)

    for asset in assets:
        quantity = sum(t.amount for t in asset.transactions)
        writer.writerow([
            asset.id, asset.name, asset.ticker or '', asset.category,
            asset.sub_category or '', asset.source or 'manual',
            quantity, asset.current_price, round(asset.value_twd or 0.0, 2), asset.include_in_net_worth
        ])

    return output.getvalue()


def reset_database(db: Session) -> None:
    SystemRepository(db).wipe_all_data()


def refresh_and_snapshot(db: Session) -> None:
    """Manually trigger price update + net worth snapshot."""
    update_prices(db)
    snapshot_net_worth(db)
