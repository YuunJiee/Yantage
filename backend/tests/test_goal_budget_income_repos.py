"""Tests for GoalRepository / BudgetRepository / IncomeRepository, which are
now thin subclasses of the generic CrudRepository base (repositories/base.py)."""

from backend import schemas
from backend.repositories.goal_repo import GoalRepository
from backend.repositories.budget_repo import BudgetRepository
from backend.repositories.income_repo import IncomeRepository


# ── GoalRepository ──────────────────────────────────────────────────────────

def test_goal_create_stamps_created_at(db):
    goal = GoalRepository(db).create(
        schemas.GoalCreate(name="Retire", target_amount=1_000_000, goal_type="NET_WORTH")
    )
    assert goal.id is not None
    assert goal.created_at is not None


def test_goal_list_all_includes_inactive_equivalents(db):
    repo = GoalRepository(db)
    repo.create(schemas.GoalCreate(name="A", target_amount=100, goal_type="NET_WORTH"))
    repo.create(schemas.GoalCreate(name="B", target_amount=200, goal_type="NET_WORTH"))
    assert len(repo.list_all()) == 2


def test_goal_update_and_delete(db):
    repo = GoalRepository(db)
    goal = repo.create(schemas.GoalCreate(name="A", target_amount=100, goal_type="NET_WORTH"))

    updated = repo.update(goal.id, schemas.GoalUpdate(name="A2"))
    assert updated.name == "A2"

    assert repo.delete(goal.id) is True
    assert repo.delete(goal.id) is False


# ── BudgetRepository ─────────────────────────────────────────────────────────

def test_budget_list_all_filters_inactive(db):
    repo = BudgetRepository(db)
    active = repo.create(schemas.BudgetCategoryCreate(name="食物", budget_amount=5000))
    repo.create(schemas.BudgetCategoryCreate(name="娛樂", budget_amount=1000, is_active=False))

    listed = repo.list_all()
    assert [c.id for c in listed] == [active.id]


def test_budget_update_and_delete(db):
    repo = BudgetRepository(db)
    cat = repo.create(schemas.BudgetCategoryCreate(name="食物", budget_amount=5000))

    updated = repo.update(cat.id, schemas.BudgetCategoryUpdate(budget_amount=6000))
    assert updated.budget_amount == 6000

    assert repo.delete(cat.id) is True


# ── IncomeRepository ─────────────────────────────────────────────────────────

def test_income_list_all_filters_inactive(db):
    repo = IncomeRepository(db)
    active = repo.create(schemas.IncomeItemCreate(name="Salary", amount=50_000))
    repo.create(schemas.IncomeItemCreate(name="Old job", amount=30_000, is_active=False))

    listed = repo.list_all()
    assert [i.id for i in listed] == [active.id]


def test_income_update_and_delete(db):
    repo = IncomeRepository(db)
    item = repo.create(schemas.IncomeItemCreate(name="Salary", amount=50_000))

    updated = repo.update(item.id, schemas.IncomeItemUpdate(amount=55_000))
    assert updated.amount == 55_000

    assert repo.delete(item.id) is True
