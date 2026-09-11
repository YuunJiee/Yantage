"""Regression tests for routers/goals.py — in particular the goal_type
immutability guard (docs/specs/goals.md R6): changing an existing goal's
type used to silently discard its target_amount/allocation_data."""

import pytest
from fastapi import HTTPException

from backend import schemas
from backend.repositories.goal_repo import GoalRepository
from backend.routers import goals as goals_router


def test_update_goal_rejects_goal_type_change(db):
    repo = GoalRepository(db)
    goal = repo.create(schemas.GoalCreate(name="Retire", target_amount=1_000_000, goal_type="NET_WORTH"))

    with pytest.raises(HTTPException) as exc_info:
        goals_router.update_goal(
            goal.id,
            schemas.GoalUpdate(goal_type="ASSET_ALLOCATION", allocation_data='{"Stock": 100}'),
            db=db,
        )
    assert exc_info.value.status_code == 422


def test_update_goal_allows_sending_the_same_goal_type(db):
    repo = GoalRepository(db)
    goal = repo.create(schemas.GoalCreate(name="Retire", target_amount=1_000_000, goal_type="NET_WORTH"))

    updated = goals_router.update_goal(
        goal.id, schemas.GoalUpdate(goal_type="NET_WORTH", target_amount=2_000_000), db=db
    )
    assert updated.target_amount == 2_000_000


def test_update_goal_allows_omitting_goal_type(db):
    repo = GoalRepository(db)
    goal = repo.create(schemas.GoalCreate(name="Retire", target_amount=1_000_000, goal_type="NET_WORTH"))

    updated = goals_router.update_goal(goal.id, schemas.GoalUpdate(name="Renamed"), db=db)
    assert updated.name == "Renamed"
    assert updated.goal_type == "NET_WORTH"


def test_update_goal_missing_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        goals_router.update_goal(9999, schemas.GoalUpdate(name="X"), db=db)
    assert exc_info.value.status_code == 404


def test_delete_goal_missing_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        goals_router.delete_goal(9999, db=db)
    assert exc_info.value.status_code == 404


def test_create_and_delete_goal(db):
    created = goals_router.create_goal(
        schemas.GoalCreate(name="Retire", target_amount=1_000_000, goal_type="NET_WORTH"), db=db
    )
    assert created.id is not None
    goals_router.delete_goal(created.id, db=db)
    assert GoalRepository(db).get(created.id) is None
