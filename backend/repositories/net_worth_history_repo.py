from sqlalchemy.orm import Session

from .. import models


class NetWorthHistoryRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_date(self, date_str: str) -> models.NetWorthHistory | None:
        return self.db.query(models.NetWorthHistory).filter_by(date=date_str).first()

    def upsert(self, date_str: str, value: float, breakdown_json: str) -> models.NetWorthHistory:
        existing = self.get_by_date(date_str)
        if existing:
            existing.value = value
            existing.breakdown = breakdown_json
        else:
            existing = models.NetWorthHistory(date=date_str, value=value, breakdown=breakdown_json)
            self.db.add(existing)
        self.db.commit()
        return existing

    def list_since(self, date_str: str) -> list[models.NetWorthHistory]:
        return (
            self.db.query(models.NetWorthHistory)
            .filter(models.NetWorthHistory.date >= date_str)
            .order_by(models.NetWorthHistory.date)
            .all()
        )
