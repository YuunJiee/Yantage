from sqlalchemy.orm import Session

from .. import models
from .base import CrudRepository


class IncomeRepository(CrudRepository[models.IncomeItem]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, models.IncomeItem)

    def _base_query(self):
        return super()._base_query().filter(models.IncomeItem.is_active == True)

    def list_all(self, skip: int = 0, limit: int = 200) -> list[models.IncomeItem]:
        return super().list_all(skip, limit)
