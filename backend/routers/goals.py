from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from .. import schemas, database
from ..repositories.goal_repo import GoalRepository

router = APIRouter(
    prefix="/api/goals",
    tags=["goals"],
    responses={404: {"description": "Not found"}},
)


@router.get("", include_in_schema=False)
@router.get("/", response_model=List[schemas.Goal])
def read_goals(skip: int = 0, limit: int = 100, db: Session = Depends(database.get_db)):
    return GoalRepository(db).list_all(skip=skip, limit=limit)


@router.post("", include_in_schema=False)
@router.post("/", response_model=schemas.Goal)
def create_goal(goal: schemas.GoalCreate, db: Session = Depends(database.get_db)):
    return GoalRepository(db).create(goal)


@router.put("/{goal_id}", response_model=schemas.Goal)
def update_goal(goal_id: int, goal: schemas.GoalUpdate, db: Session = Depends(database.get_db)):
    repo = GoalRepository(db)
    existing = repo.get(goal_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="Goal not found")
    if goal.goal_type is not None and goal.goal_type != existing.goal_type:
        raise HTTPException(
            status_code=422,
            detail="Cannot change an existing goal's type — delete and recreate it instead",
        )
    return repo.update(goal_id, goal)


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, db: Session = Depends(database.get_db)):
    if not GoalRepository(db).delete(goal_id):
        raise HTTPException(status_code=404, detail="Goal not found")
    return None
