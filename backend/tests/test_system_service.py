from datetime import datetime

from backend import models, schemas
from backend.repositories.asset_repo import AssetRepository
from backend.services import system_service
from backend.utils.db_path import sqlite_path_from_url


def test_sqlite_path_from_url_strips_prefix():
    assert sqlite_path_from_url("sqlite:////data/sql_app.db") == "/data/sql_app.db"


def test_wipe_all_data_empties_tables_and_reseeds_budget_start_day(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Cash", category="Fluid", current_price=1.0))
    repo.create_transaction(schemas.TransactionCreate(amount=100.0, buy_price=1.0, date=datetime(2025, 1, 1)), asset.id)
    db.add(models.Goal(name="Retire", target_amount=1000, goal_type="NET_WORTH", created_at=datetime.now()))
    db.add(models.SystemSetting(key="budget_start_day", value="15"))
    db.commit()

    system_service.reset_database(db)

    assert db.query(models.Asset).count() == 0
    assert db.query(models.Transaction).count() == 0
    assert db.query(models.Goal).count() == 0
    settings = {s.key: s.value for s in db.query(models.SystemSetting).all()}
    assert settings == {"budget_start_day": "1"}


def test_build_assets_csv_includes_header_and_asset_row(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Cash", category="Fluid", current_price=1.0))
    repo.create_transaction(schemas.TransactionCreate(amount=100.0, buy_price=1.0, date=datetime(2025, 1, 1)), asset.id)

    csv_content = system_service.build_assets_csv(db)

    lines = csv_content.strip().splitlines()
    assert lines[0] == "ID,Name,Ticker,Category,Sub-Category,Source,Quantity,Current Price,Value (approx),Include in NW"
    assert f"{asset.id},Cash,,Fluid,,manual,100.0,1.0,100.0,True" in lines[1]
