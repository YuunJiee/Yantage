import pytest

from backend.repositories.net_worth_history_repo import NetWorthHistoryRepository


def test_upsert_creates_new_entry(db):
    repo = NetWorthHistoryRepository(db)
    repo.upsert("2025-01-01", 100_000.0, '{"Fluid": 100000}')

    entry = repo.get_by_date("2025-01-01")
    assert entry.value == pytest.approx(100_000.0)
    assert entry.breakdown == '{"Fluid": 100000}'


def test_upsert_updates_existing_entry(db):
    repo = NetWorthHistoryRepository(db)
    repo.upsert("2025-01-01", 100_000.0, "{}")
    repo.upsert("2025-01-01", 150_000.0, "{}")

    entries = repo.list_since("2025-01-01")
    assert len(entries) == 1
    assert entries[0].value == pytest.approx(150_000.0)


def test_get_by_date_missing_returns_none(db):
    assert NetWorthHistoryRepository(db).get_by_date("2099-01-01") is None


def test_list_since_filters_and_orders(db):
    repo = NetWorthHistoryRepository(db)
    repo.upsert("2025-01-03", 300.0, "{}")
    repo.upsert("2025-01-01", 100.0, "{}")
    repo.upsert("2025-01-02", 200.0, "{}")

    dates = [e.date for e in repo.list_since("2025-01-02")]
    assert dates == ["2025-01-02", "2025-01-03"]
