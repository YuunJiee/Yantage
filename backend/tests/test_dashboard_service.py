"""Tests for dashboard_service.py — the core net-worth/P&L/ROI calculation.
Zero prior coverage despite being the single most-viewed number in the app."""

from datetime import datetime

import pytest

from backend import schemas
from backend.repositories.asset_repo import AssetRepository
from backend.services.dashboard_service import calculate_dashboard_metrics


def _asset_with_transaction(db, *, category="Fluid", amount=1000.0, buy_price=1.0, current_price=1.0, include_in_net_worth=True):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(
        name="X", category=category, current_price=current_price, include_in_net_worth=include_in_net_worth,
    ))
    repo.create_transaction(
        schemas.TransactionCreate(amount=amount, buy_price=buy_price, date=datetime(2025, 1, 1)), asset.id
    )
    return asset


def test_net_worth_with_no_assets_is_zero(db):
    result = calculate_dashboard_metrics(db)
    assert result.net_worth == pytest.approx(0.0)
    assert result.total_pl == pytest.approx(0.0)
    assert result.total_roi == pytest.approx(0.0)


def test_net_worth_sums_positive_categories(db):
    _asset_with_transaction(db, category="Fluid", amount=1000.0, current_price=1.0)
    _asset_with_transaction(db, category="Stock", amount=10.0, current_price=100.0, buy_price=80.0)

    result = calculate_dashboard_metrics(db)
    assert result.net_worth == pytest.approx(1000.0 + 1000.0)


def test_liabilities_are_subtracted_from_net_worth(db):
    _asset_with_transaction(db, category="Fluid", amount=1000.0, current_price=1.0)
    _asset_with_transaction(db, category="Liabilities", amount=300.0, current_price=1.0, buy_price=1.0)

    result = calculate_dashboard_metrics(db)
    assert result.net_worth == pytest.approx(1000.0 - 300.0)


def test_excluded_assets_do_not_affect_net_worth(db):
    _asset_with_transaction(db, category="Fluid", amount=1000.0, current_price=1.0, include_in_net_worth=False)

    result = calculate_dashboard_metrics(db)
    assert result.net_worth == pytest.approx(0.0)


def test_roi_reflects_unrealized_gain(db):
    # Bought 10 shares at 80, now worth 100 each: cost=800, value=1000, pl=200, roi=25%
    _asset_with_transaction(db, category="Stock", amount=10.0, current_price=100.0, buy_price=80.0)

    result = calculate_dashboard_metrics(db)
    assert result.total_pl == pytest.approx(200.0)
    assert result.total_roi == pytest.approx(25.0)


def test_dashboard_data_includes_enriched_assets(db):
    _asset_with_transaction(db, category="Fluid", amount=500.0, current_price=1.0)

    result = calculate_dashboard_metrics(db)
    assert len(result.assets) == 1
    assert result.assets[0].value_twd == pytest.approx(500.0)
