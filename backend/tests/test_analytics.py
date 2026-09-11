"""Tests for analytics_service.py.

DB tests use the shared ``db`` fixture and autouse mocks from conftest.py.
"""

import json
import re
import pytest
from datetime import date, datetime, timedelta
from unittest.mock import patch

from backend import models, schemas
from backend.repositories.asset_repo import AssetRepository
from backend.repositories.goal_repo import GoalRepository
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


def test_net_worth_history_propagates_errors_instead_of_swallowing(db):
    """Pins the fix removing the blanket try/except that used to turn any
    failure (a real bug, a DB error) into an indistinguishable empty []."""
    with patch(
        "backend.services.analytics_service.NetWorthHistoryRepository.list_since",
        side_effect=RuntimeError("boom"),
    ):
        with pytest.raises(RuntimeError):
            analytics_service.get_net_worth_history(db, range_str="30d")


def test_goal_forecast_propagates_errors_instead_of_swallowing(db):
    with patch(
        "backend.services.analytics_service.GoalRepository.list_all",
        side_effect=RuntimeError("boom"),
    ):
        with pytest.raises(RuntimeError):
            analytics_service.compute_goal_forecast(db)


def test_goal_forecast_propagates_errors_from_dashboard_metrics(db):
    with patch(
        "backend.services.analytics_service.calculate_dashboard_metrics",
        side_effect=RuntimeError("boom"),
    ):
        with pytest.raises(RuntimeError):
            analytics_service.compute_goal_forecast(db)


# ── compute_goal_forecast (docs/specs/goals.md R3-R5) ─────────────────────────

def _asset(db, *, category="Fluid", amount=1000.0, current_price=1.0):
    repo = AssetRepository(db)
    asset = repo.create(schemas.AssetCreate(name="X", category=category, current_price=current_price))
    repo.create_transaction(schemas.TransactionCreate(amount=amount, buy_price=current_price), asset.id)
    return asset


def test_goal_forecast_excludes_asset_allocation_goals(db):
    GoalRepository(db).create(schemas.GoalCreate(
        name="Alloc", target_amount=100, goal_type="ASSET_ALLOCATION", allocation_data='{"Stock": 100}',
    ))
    result = analytics_service.compute_goal_forecast(db)
    assert result["forecasts"] == []


def test_goal_forecast_achieved_when_live_net_worth_meets_target(db):
    """R3: the completion check uses the live dashboard net worth, not a
    stale/absent history snapshot."""
    _asset(db, amount=1_000_000.0, current_price=1.0)
    goal = GoalRepository(db).create(
        schemas.GoalCreate(name="Retire", target_amount=500_000, goal_type="NET_WORTH")
    )
    result = analytics_service.compute_goal_forecast(db)
    forecast = next(f for f in result["forecasts"] if f["goal_id"] == goal.id)
    assert forecast["predicted_date"] == "已達成"
    assert forecast["months_to_reach"] == 0
    assert forecast["current_amount"] == pytest.approx(1_000_000.0)


def test_goal_forecast_uses_live_net_worth_not_stale_snapshot(db):
    """A history snapshot showing the target already met must NOT mark the
    goal achieved if the live (current) net worth hasn't actually met it —
    this is the exact staleness bug R3 fixes."""
    _insert_snapshots(db, n_days=182, start_value=600_000.0)  # flat: value stays 600k+i*1000
    # No real assets created -> live net worth is 0, well below target.
    goal = GoalRepository(db).create(
        schemas.GoalCreate(name="Retire", target_amount=500_000, goal_type="NET_WORTH")
    )
    result = analytics_service.compute_goal_forecast(db)
    forecast = next(f for f in result["forecasts"] if f["goal_id"] == goal.id)
    assert forecast["current_amount"] == pytest.approx(0.0)
    assert forecast["predicted_date"] != "已達成"


def test_goal_forecast_no_growth_prediction_in_chinese(db):
    goal = GoalRepository(db).create(
        schemas.GoalCreate(name="Retire", target_amount=500_000, goal_type="NET_WORTH")
    )
    result = analytics_service.compute_goal_forecast(db)
    forecast = next(f for f in result["forecasts"] if f["goal_id"] == goal.id)
    assert forecast["predicted_date"] == "成長趨勢不明"
    assert forecast["months_to_reach"] == 999


def test_goal_forecast_predicted_date_is_chinese_year_month_format(db):
    _insert_snapshots(db, n_days=182, start_value=100_000.0)  # grows by 1000/day
    goal = GoalRepository(db).create(
        schemas.GoalCreate(name="Retire", target_amount=10_000_000, goal_type="NET_WORTH")
    )
    result = analytics_service.compute_goal_forecast(db)
    forecast = next(f for f in result["forecasts"] if f["goal_id"] == goal.id)
    assert re.match(r"^\d+年\d{1,2}月$", forecast["predicted_date"]), forecast["predicted_date"]
