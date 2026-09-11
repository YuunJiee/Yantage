from datetime import datetime
from sqlalchemy.orm import Session

from .. import models, schemas
from .base import CrudRepository


class GoalRepository(CrudRepository[models.Goal]):
    def __init__(self, db: Session) -> None:
        super().__init__(db, models.Goal)

    def create(self, data: schemas.GoalCreate) -> models.Goal:
        return super().create(data, created_at=datetime.now())
