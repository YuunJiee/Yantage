from sqlalchemy.orm import Session

from .. import models
from .base import CrudRepository


class BudgetRepository(CrudRepository[models.BudgetCategory]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, models.BudgetCategory)

    def _base_query(self):
        return super()._base_query().filter(models.BudgetCategory.is_active == True)

    def list_all(self, skip: int = 0, limit: int = 200) -> list[models.BudgetCategory]:
        return super().list_all(skip, limit)
