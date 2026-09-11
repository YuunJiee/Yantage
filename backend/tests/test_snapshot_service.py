"""Tests for snapshot_service.py — writes today's net worth to
NetWorthHistory so the history endpoint can serve fast snapshot reads."""

import json
from datetime import datetime

import pytest

from backend import schemas
from backend.repositories.asset_repo import AssetRepository
from backend.repositories.net_worth_history_repo import NetWorthHistoryRepository
from backend.services.snapshot_service import snapshot_net_worth


def _asset_with_transaction(db, *, category="Fluid", amount=1000.0, current_price=1.0):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="X", category=category, current_price=current_price))
    repo.create_transaction(
        schemas.TransactionCreate(amount=amount, buy_price=1.0, date=datetime(2025, 1, 1)), asset.id
    )
    return asset


def test_snapshot_writes_net_worth_for_today(db):
    _asset_with_transaction(db, category="Fluid", amount=50_000.0)

    snapshot_net_worth(db)

    today = datetime.now().strftime("%Y-%m-%d")
    entry = NetWorthHistoryRepository(db).get_by_date(today)
    assert entry is not None
    assert entry.value == pytest.approx(50_000.0)


def test_snapshot_breakdown_is_per_category(db):
    _asset_with_transaction(db, category="Fluid", amount=1000.0)
    _asset_with_transaction(db, category="Stock", amount=10.0, current_price=100.0)

    snapshot_net_worth(db)

    today = datetime.now().strftime("%Y-%m-%d")
    entry = NetWorthHistoryRepository(db).get_by_date(today)
    breakdown = json.loads(entry.breakdown)
    assert breakdown["Fluid"] == pytest.approx(1000.0)
    assert breakdown["Stock"] == pytest.approx(1000.0)


def test_snapshot_liabilities_are_negative_in_breakdown(db):
    _asset_with_transaction(db, category="Liabilities", amount=200.0)

    snapshot_net_worth(db)

    today = datetime.now().strftime("%Y-%m-%d")
    entry = NetWorthHistoryRepository(db).get_by_date(today)
    breakdown = json.loads(entry.breakdown)
    assert breakdown["Liabilities"] == pytest.approx(-200.0)
    assert entry.value == pytest.approx(-200.0)


def test_snapshot_skipped_when_net_worth_is_zero(db):
    # No assets at all → net worth is exactly 0, which likely means a price
    # fetch failure rather than a real zero net worth — skip writing.
    snapshot_net_worth(db)

    today = datetime.now().strftime("%Y-%m-%d")
    assert NetWorthHistoryRepository(db).get_by_date(today) is None


def test_snapshot_upserts_existing_entry_for_today(db):
    _asset_with_transaction(db, category="Fluid", amount=1000.0)
    snapshot_net_worth(db)

    # Add more funds and snapshot again the same day.
    AssetRepository(db).create_transaction(
        schemas.TransactionCreate(amount=500.0, buy_price=1.0, date=datetime.now()),
        AssetRepository(db).list_all()[0].id,
    )
    snapshot_net_worth(db)

    today = datetime.now().strftime("%Y-%m-%d")
    entries = NetWorthHistoryRepository(db).list_since(today)
    assert len(entries) == 1
    assert entries[0].value == pytest.approx(1500.0)
