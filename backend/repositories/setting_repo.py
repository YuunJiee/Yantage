from sqlalchemy.orm import Session

from .. import models


class SettingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, key: str) -> models.SystemSetting | None:
        return self.db.query(models.SystemSetting).filter(models.SystemSetting.key == key).first()

    def list_all(self, skip: int = 0, limit: int = 100) -> list[models.SystemSetting]:
        return self.db.query(models.SystemSetting).offset(skip).limit(limit).all()

    def upsert(self, key: str, value: str) -> models.SystemSetting:
        db_setting = self.get(key)
        if db_setting:
            db_setting.value = value
        else:
            db_setting = models.SystemSetting(key=key, value=value)
            self.db.add(db_setting)
        self.db.commit()
        self.db.refresh(db_setting)
        return db_setting
