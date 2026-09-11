from typing import Generic, TypeVar

from pydantic import BaseModel
from sqlalchemy.orm import Session

ModelT = TypeVar("ModelT")


class CrudRepository(Generic[ModelT]):
    """Generic list/create/update/delete for simple, flat CRUD models
    (Goal, BudgetCategory, IncomeItem) that only differ in the model class,
    whether list_all() filters on is_active, and any extra fields create()
    needs to stamp — both handled by subclass overrides, see goal_repo.py /
    budget_repo.py / income_repo.py."""

    def __init__(self, db: Session, model: type[ModelT]) -> None:
        self.db = db
        self.model = model

    def _base_query(self):
        return self.db.query(self.model)

    def get(self, item_id: int) -> ModelT | None:
        return self._base_query().filter(self.model.id == item_id).first()

    def list_all(self, skip: int = 0, limit: int = 100) -> list[ModelT]:
        return self._base_query().offset(skip).limit(limit).all()

    def create(self, data: BaseModel, **extra_fields) -> ModelT:
        db_item = self.model(**data.model_dump(), **extra_fields)
        self.db.add(db_item)
        self.db.commit()
        self.db.refresh(db_item)
        return db_item

    def update(self, item_id: int, data: BaseModel) -> ModelT | None:
        db_item = self.db.query(self.model).filter(self.model.id == item_id).first()
        if db_item:
            for key, value in data.model_dump(exclude_unset=True).items():
                setattr(db_item, key, value)
            self.db.commit()
            self.db.refresh(db_item)
        return db_item

    def delete(self, item_id: int) -> bool:
        db_item = self.db.query(self.model).filter(self.model.id == item_id).first()
        if db_item:
            self.db.delete(db_item)
            self.db.commit()
            return True
        return False
