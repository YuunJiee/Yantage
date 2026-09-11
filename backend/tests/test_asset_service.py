"""Unit tests for AssetService — the value_twd/unrealized_pl/roi enrichment
that used to live directly on AssetRepository (moved out in the repo→service
layering fix, see repositories/asset_repo.py)."""

import pytest
from datetime import datetime

from backend import schemas
from backend.repositories.asset_repo import AssetRepository
from backend.services.asset_service import AssetService


def _transaction(amount: float = 1000.0, buy_price: float = 1.0) -> schemas.TransactionCreate:
    return schemas.TransactionCreate(amount=amount, buy_price=buy_price, date=datetime(2025, 1, 1))


def test_get_asset_computes_value_twd_fluid(db):
    """Fluid assets are TWD-denominated: value_twd = price × qty."""
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Savings", category="Fluid", current_price=1.0))
    repo.create_transaction(_transaction(amount=50_000.0, buy_price=1.0), asset.id)
    fetched = AssetService(db).get(asset.id)
    assert fetched.value_twd == pytest.approx(50_000.0)


def test_list_all_value_twd_no_transactions(db):
    repo = AssetRepository(db)
    repo.create(schemas.AssetCreate(name="Cash", category="Fluid", current_price=1.0))
    assert AssetService(db).list_all()[0].value_twd == pytest.approx(0.0)


def test_list_all_value_twd_with_transaction(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="ETF", category="Fluid", current_price=100.0))
    repo.create_transaction(_transaction(amount=10.0, buy_price=90.0), asset.id)
    assert AssetService(db).list_all()[0].value_twd == pytest.approx(1_000.0)


def test_list_all_roi_computed(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Stock", category="Stock", ticker="2330.TW", current_price=1_000.0))
    repo.create_transaction(_transaction(amount=1.0, buy_price=800.0), asset.id)
    assert AssetService(db).list_all()[0].roi == pytest.approx(25.0)
