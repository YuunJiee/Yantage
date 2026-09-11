import csv
import io
import os

from sqlalchemy.orm import Session

from .. import database
from ..repositories.asset_repo import AssetRepository
from ..repositories.system_repo import SystemRepository
from ..utils.db_path import sqlite_path_from_url
from .price_service import update_prices
from .snapshot_service import snapshot_net_worth

CSV_HEADER = ['ID', 'Name', 'Ticker', 'Category', 'Sub-Category', 'Source', 'Quantity', 'Current Price', 'Value (approx)', 'Include in NW']


def get_backup_file_path() -> str | None:
    db_path = sqlite_path_from_url(database.DATABASE_URL)
    return db_path if os.path.exists(db_path) else None


def build_assets_csv(db: Session) -> str:
    assets = AssetRepository(db).list_all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(CSV_HEADER)

    for asset in assets:
        quantity = sum(t.amount for t in asset.transactions)
        value = quantity * (asset.current_price or 0)
        writer.writerow([
            asset.id, asset.name, asset.ticker or '', asset.category,
            asset.sub_category or '', asset.source or 'manual',
            quantity, asset.current_price, round(value, 2), asset.include_in_net_worth
        ])

    return output.getvalue()


def reset_database(db: Session) -> None:
    SystemRepository(db).wipe_all_data()


def refresh_and_snapshot(db: Session) -> None:
    """Manually trigger price update + net worth snapshot."""
    update_prices(db)
    snapshot_net_worth(db)
