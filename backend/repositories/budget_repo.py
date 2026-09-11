from sqlalchemy.orm import Session

from .. import models
from .base import CrudRepository


class BudgetRepository(CrudRepository[models.BudgetCategory]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, models.BudgetCategory)
