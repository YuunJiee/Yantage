"""Tests for analytics_service.py.

DB tests use the shared ``db`` fixture and autouse mocks from conftest.py.
"""

import json
import pytest
from datetime import date, datetime, timedelta

from backend import models
from backend.services import analytics_service


# ── Helpers ───────────────────────────────────────────────────────────────────

def _insert_snapshots(db, n_days: int, start_value: float = 1_000_000.0) -> None:
    today = date.today()
    for i in range(n_days):
        d = (today - timedelta(days=n_days - 1 - i)).strftime("%Y-%m-%d")
        db.add(models.NetWorthHistory(
            date=d,
            value=start_value + i * 1_000,
            breakdown=json.dumps({"Fluid": start_value + i * 1_000}),
        ))
    db.commit()


# ── parse_range ───────────────────────────────────────────────────────────────

def test_parse_range_30d():
    assert (date.today() - analytics_service.parse_range("30d")).days == 30


def test_parse_range_ytd():
    assert analytics_service.parse_range("ytd") == date(date.today().year, 1, 1)


def test_parse_range_all():
    assert analytics_service.parse_range("all") == date(2020, 1, 1)


def test_parse_range_unknown_defaults_to_1y():
    assert (date.today() - analytics_service.parse_range("banana")).days == 365


# ── get_net_worth_history — fast path ─────────────────────────────────────────

def test_net_worth_history_fast_path_returns_snapshots(db):
    _insert_snapshots(db, n_days=30)
    result = analytics_service.get_net_worth_history(db, range_str="30d")
    assert len(result) == 30
    assert all("date" in r and "value" in r and "breakdown" in r for r in result)


def test_net_worth_history_fast_path_values_correct(db):
    _insert_snapshots(db, n_days=30, start_value=500_000.0)
    result = analytics_service.get_net_worth_history(db, range_str="30d")
    assert result[0]["value"] == pytest.approx(500_000.0)
    assert result[-1]["value"] == pytest.approx(500_000.0 + 29 * 1_000)


def test_net_worth_history_breakdown_parsed(db):
    _insert_snapshots(db, n_days=30)
    result = analytics_service.get_net_worth_history(db, range_str="30d")
    assert isinstance(result[0]["breakdown"], dict)
    assert "Fluid" in result[0]["breakdown"]


def test_net_worth_history_slow_path_no_assets_returns_empty_series(db):
    # No snapshots, no assets → slow path runs but produces zero-value entries
    result = analytics_service.get_net_worth_history(db, range_str="30d")
    assert isinstance(result, list)
    assert len(result) == 31  # 30d range = 31 days inclusive
    assert all(r["value"] == 0.0 for r in result)
