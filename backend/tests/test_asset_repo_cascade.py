"""Pins the fix for orphaned transactions: deleting an asset used to leave
its transactions behind with a dangling asset_id. Asset.transactions now
declares cascade="all, delete-orphan" (models.py), matching the pattern
already used by CryptoConnection.assets."""

from datetime import datetime

from backend import models, schemas
from backend.repositories.asset_repo import AssetRepository


def test_deleting_asset_cascades_to_its_transactions(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Cash", category="Fluid", current_price=1.0))
    repo.create_transaction(
        schemas.TransactionCreate(amount=100.0, buy_price=1.0, date=datetime(2025, 1, 1)), asset.id
    )
    repo.create_transaction(
        schemas.TransactionCreate(amount=-50.0, buy_price=1.0, date=datetime(2025, 1, 2)), asset.id
    )
    assert db.query(models.Transaction).filter_by(asset_id=asset.id).count() == 2

    assert repo.delete(asset.id) is True

    assert db.query(models.Transaction).filter_by(asset_id=asset.id).count() == 0
