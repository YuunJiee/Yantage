"""Regression tests for routers/assets.py's provider-synced-asset guards.

Pins parity across create/update/delete of a transaction, and across all
four sync providers (max/binance/pionex/wallet) — not just MAX, which was
the only one guarded (and only at update/delete, not create) before
docs/specs/assets-transactions.md R5/Decision 3."""

import pytest
from datetime import datetime
from fastapi import HTTPException

from backend import schemas
from backend.repositories.asset_repo import AssetRepository
from backend.routers import assets as assets_router

MANAGED_SOURCES = ["max", "binance", "pionex", "wallet"]


def _asset_with_transaction(db, source: str):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="BTC", category="Crypto", ticker="BTC", source=source))
    tx = repo.create_transaction(
        schemas.TransactionCreate(amount=1.0, buy_price=0, date=datetime.now()), asset.id
    )
    return asset, tx


@pytest.mark.parametrize("source", MANAGED_SOURCES)
def test_delete_transaction_blocked_for_provider_synced_asset(db, source):
    _, tx = _asset_with_transaction(db, source)
    with pytest.raises(HTTPException) as exc_info:
        assets_router.delete_transaction_endpoint(tx.id, db=db)
    assert exc_info.value.status_code == 403


@pytest.mark.parametrize("source", MANAGED_SOURCES)
def test_update_transaction_blocked_for_provider_synced_asset(db, source):
    _, tx = _asset_with_transaction(db, source)
    with pytest.raises(HTTPException) as exc_info:
        assets_router.update_transaction_endpoint(tx.id, schemas.TransactionUpdate(amount=2.0), db=db)
    assert exc_info.value.status_code == 403


@pytest.mark.parametrize("source", MANAGED_SOURCES)
def test_create_transaction_blocked_for_provider_synced_asset(db, source):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="BTC", category="Crypto", ticker="BTC", source=source))
    with pytest.raises(HTTPException) as exc_info:
        assets_router.create_transaction_for_asset(
            asset.id, schemas.TransactionCreate(amount=1.0, buy_price=0), db=db
        )
    assert exc_info.value.status_code == 403


def test_delete_transaction_allowed_for_manual_asset(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Cash", category="Fluid"))
    tx = repo.create_transaction(
        schemas.TransactionCreate(amount=100.0, buy_price=1.0, date=datetime.now()), asset.id
    )
    assets_router.delete_transaction_endpoint(tx.id, db=db)
    assert repo.get_transaction(tx.id) is None


def test_update_transaction_allowed_for_manual_asset(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Cash", category="Fluid"))
    tx = repo.create_transaction(
        schemas.TransactionCreate(amount=100.0, buy_price=1.0, date=datetime.now()), asset.id
    )
    updated = assets_router.update_transaction_endpoint(tx.id, schemas.TransactionUpdate(amount=200.0), db=db)
    assert updated.amount == 200.0


def test_create_transaction_allowed_for_manual_asset(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Cash", category="Fluid"))
    created = assets_router.create_transaction_for_asset(
        asset.id, schemas.TransactionCreate(amount=100.0, buy_price=1.0), db=db
    )
    assert created.amount == 100.0


def test_create_transaction_missing_asset_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        assets_router.create_transaction_for_asset(
            9999, schemas.TransactionCreate(amount=1.0, buy_price=0), db=db
        )
    assert exc_info.value.status_code == 404


def test_delete_transaction_missing_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        assets_router.delete_transaction_endpoint(9999, db=db)
    assert exc_info.value.status_code == 404
