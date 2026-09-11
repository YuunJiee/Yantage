"""Tests for exchange_rate_service.py's DB fallback/caching, now routed
through SettingRepository instead of raw db.query()."""

from unittest.mock import patch

from backend.services import exchange_rate_service


def _reset_cache():
    exchange_rate_service._rate_cache["timestamp"] = 0


def test_get_rate_updates_db_setting_on_successful_fetch(db):
    _reset_cache()
    with patch("backend.services.exchange_rate_service.fetch_rate_from_max", return_value=31.5):
        rate = exchange_rate_service.get_usdt_twd_rate(db)
    assert rate == 31.5

    from backend.repositories.setting_repo import SettingRepository
    setting = SettingRepository(db).get("exchange_rate_usdtwd")
    assert setting.value == "31.5"


def test_get_rate_falls_back_to_db_value_when_fetch_fails(db):
    _reset_cache()
    from backend.repositories.setting_repo import SettingRepository
    SettingRepository(db).upsert("exchange_rate_usdtwd", "30.2")

    with patch("backend.services.exchange_rate_service.fetch_rate_from_max", return_value=None):
        rate = exchange_rate_service.get_usdt_twd_rate(db)
    assert rate == 30.2


def test_get_rate_hard_fallback_when_no_fetch_and_no_db_value(db):
    _reset_cache()
    with patch("backend.services.exchange_rate_service.fetch_rate_from_max", return_value=None):
        rate = exchange_rate_service.get_usdt_twd_rate(db)
    assert rate == 32.0
