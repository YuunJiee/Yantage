"""Regression tests for routers/assets.py's MAX-synced transaction guards.

Pins parity between update and delete: editing a MAX-synced transaction was
already blocked, but deleting one wasn't — same rule should apply to both.
"""

import pytest
from datetime import datetime
from fastapi import HTTPException

from backend import schemas
from backend.repositories.asset_repo import AssetRepository
from backend.routers import assets as assets_router


def _max_asset_with_transaction(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="BTC", category="Crypto", ticker="BTC", source="max"))
    tx = repo.create_transaction(
        schemas.TransactionCreate(amount=1.0, buy_price=0, date=datetime.now()), asset.id
    )
    return asset, tx


def test_delete_transaction_blocked_for_max_synced_asset(db):
    _, tx = _max_asset_with_transaction(db)
    with pytest.raises(HTTPException) as exc_info:
        assets_router.delete_transaction_endpoint(tx.id, db=db)
    assert exc_info.value.status_code == 403


def test_delete_transaction_allowed_for_manual_asset(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Cash", category="Fluid"))
    tx = repo.create_transaction(
        schemas.TransactionCreate(amount=100.0, buy_price=1.0, date=datetime.now()), asset.id
    )
    assets_router.delete_transaction_endpoint(tx.id, db=db)
    assert repo.get_transaction(tx.id) is None


def test_delete_transaction_missing_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        assets_router.delete_transaction_endpoint(9999, db=db)
    assert exc_info.value.status_code == 404
