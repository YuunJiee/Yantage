from unittest.mock import patch

from backend.services import settings_service


def test_get_setting_or_default_falls_back_to_default(db):
    setting = settings_service.get_setting_or_default(db, "chart_theme")
    assert setting.value == "Morandi"


def test_get_setting_or_default_unknown_key_returns_none(db):
    assert settings_service.get_setting_or_default(db, "not_a_real_key") is None


def test_update_setting_then_read_overrides_default(db):
    settings_service.update_setting(db, "chart_theme", "Ocean")
    setting = settings_service.get_setting_or_default(db, "chart_theme")
    assert setting.value == "Ocean"


def test_list_settings_masked_masks_secret_keys(db):
    settings_service.update_setting(db, "binance_api_secret", "abcd1234efgh")
    settings_service.update_setting(db, "budget_start_day", "5")

    masked = {s.key: s.value for s in settings_service.list_settings_masked(db)}
    assert masked["binance_api_secret"] == "********efgh"
    assert masked["budget_start_day"] == "5"


def test_update_setting_reschedules_only_for_interval_key(db):
    with patch("backend.services.settings_service.scheduler.reschedule_updates") as mock_reschedule:
        settings_service.update_setting(db, "chart_theme", "Ocean")
        mock_reschedule.assert_not_called()

        settings_service.update_setting(db, "price_update_interval_minutes", "30")
        mock_reschedule.assert_called_once_with(30)
