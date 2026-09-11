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


def test_get_returns_enriched_asset(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Cash", category="Fluid", current_price=1.0))
    repo.create_transaction(_transaction(amount=500.0, buy_price=1.0), asset.id)
    fetched = AssetService(db).get(asset.id)
    assert fetched.value_twd == pytest.approx(500.0)


def test_get_missing_returns_none(db):
    assert AssetService(db).get(9999) is None


def test_create_returns_enriched_asset(db):
    created = AssetService(db).create(schemas.AssetCreate(name="Savings", category="Fluid", current_price=1.0))
    assert created.value_twd == pytest.approx(0.0)
    assert created.unrealized_pl == pytest.approx(0.0)
    assert created.roi == pytest.approx(0.0)


def test_update_returns_enriched_asset(db):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="Cash", category="Fluid", current_price=1.0))
    repo.create_transaction(_transaction(amount=200.0, buy_price=1.0), asset.id)

    updated = AssetService(db).update(asset.id, schemas.AssetUpdate(name="Renamed"))
    assert updated.name == "Renamed"
    assert updated.value_twd == pytest.approx(200.0)


def test_update_missing_returns_none(db):
    assert AssetService(db).update(9999, schemas.AssetUpdate(name="X")) is None


# ── R2: remaining-cost-basis ROI (docs/specs/assets-transactions.md) ─────────
#
# A sell must proportionally reduce invested_capital, not leave it at the
# lifetime buy total — otherwise ROI after a partial sell is computed
# against a cost basis that includes units no longer held.

def test_roi_unaffected_by_a_sell_that_exactly_matches_original_cost_ratio(db):
    """Buy 10 @ 100 (invested=1000), sell 4 -> remaining cost basis should be
    60% of 1000 = 600, on a remaining balance of 6 units."""
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="ETF", category="Fluid", current_price=150.0))
    repo.create_transaction(_transaction(amount=10.0, buy_price=100.0), asset.id)
    repo.create_transaction(_transaction(amount=-4.0, buy_price=0.0), asset.id)

    enriched = AssetService(db).list_all()[0]
    assert enriched.value_twd == pytest.approx(6 * 150.0)  # 900
    assert enriched.unrealized_pl == pytest.approx(900.0 - 600.0)  # 300
    assert enriched.roi == pytest.approx(50.0)


def test_roi_after_full_sell_is_zero_not_negative(db):
    """Fully closing a position must not leave a stale invested_capital
    behind that turns a flat/closed position into a phantom loss."""
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="ETF", category="Fluid", current_price=150.0))
    repo.create_transaction(_transaction(amount=10.0, buy_price=100.0), asset.id)
    repo.create_transaction(_transaction(amount=-10.0, buy_price=0.0), asset.id)

    enriched = AssetService(db).list_all()[0]
    assert enriched.value_twd == pytest.approx(0.0)
    assert enriched.unrealized_pl == pytest.approx(0.0)
    assert enriched.roi == pytest.approx(0.0)


def test_roi_after_partial_sell_then_rebuy_uses_blended_cost_basis(db):
    """Buy 10 @ 100 (invested=1000), sell 4 (-> invested=600, balance=6),
    buy 4 more @ 200 (-> invested=600+800=1400, balance=10)."""
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="ETF", category="Fluid", current_price=140.0))
    repo.create_transaction(_transaction(amount=10.0, buy_price=100.0), asset.id)
    repo.create_transaction(_transaction(amount=-4.0, buy_price=0.0), asset.id)
    repo.create_transaction(_transaction(amount=4.0, buy_price=200.0), asset.id)

    enriched = AssetService(db).list_all()[0]
    assert enriched.value_twd == pytest.approx(10 * 140.0)  # 1400
    assert enriched.unrealized_pl == pytest.approx(1400.0 - 1400.0)  # 0
    assert enriched.roi == pytest.approx(0.0)
