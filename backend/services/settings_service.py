import logging

from sqlalchemy.orm import Session

from .. import models, scheduler
from ..repositories.setting_repo import SettingRepository
from ..utils.secrets import mask_secret_tail

logger = logging.getLogger("uvicorn")

_SECRET_KEY_MARKERS = ("key", "secret", "password", "token")

DEFAULT_SETTINGS: dict[str, str] = {
    "price_update_interval_minutes": "60",
    "budget_start_day": "1",
    "chart_theme": "Morandi",
    "visible_categories": '["Fluid","Investment","Fixed","Receivables","Liabilities"]',
    "wealth_simulator_monthly_contribution": "10000",
    "wealth_simulator_annual_return": "6",
    "wealth_simulator_years": "20",
    "wealth_simulator_initial_amount": "0",
    "emergency_fund_monthly_expense": "30000",
    "emergency_fund_target_months": "6",
    "emergency_fund_cash": "0",
}


def list_settings_masked(db: Session, skip: int = 0, limit: int = 100) -> list[models.SystemSetting]:
    settings = SettingRepository(db).list_all(skip, limit)
    masked: list[models.SystemSetting] = []
    for s in settings:
        if any(marker in s.key.lower() for marker in _SECRET_KEY_MARKERS):
            masked.append(models.SystemSetting(key=s.key, value=mask_secret_tail(s.value)))
        else:
            masked.append(s)
    return masked


def get_setting_or_default(db: Session, key: str) -> models.SystemSetting | None:
    """Returns the stored setting, a synthesized default, or None if neither exists."""
    setting = SettingRepository(db).get(key)
    if setting is not None:
        return setting
    if key in DEFAULT_SETTINGS:
        return models.SystemSetting(key=key, value=DEFAULT_SETTINGS[key])
    return None


def update_setting(db: Session, key: str, value: str) -> models.SystemSetting:
    db_setting = SettingRepository(db).upsert(key, value)
    if key == "price_update_interval_minutes":
        try:
            scheduler.reschedule_updates(int(db_setting.value))
        except Exception as e:
            logger.error(f"Failed to reschedule: {e}")
    return db_setting
