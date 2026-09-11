"""HTTP-adjacent (direct router-call) tests for the Budgets/Income domain —
previously had zero router-level coverage (docs/specs/budgets-income.md)."""

import pytest
from fastapi import HTTPException

from backend import schemas
from backend.repositories.budget_repo import BudgetRepository
from backend.repositories.income_repo import IncomeRepository
from backend.routers import budgets as budgets_router
from backend.routers import income as income_router


# ── Budgets ───────────────────────────────────────────────────────────────────

def test_create_budget_category(db):
    created = budgets_router.create_budget_category(
        schemas.BudgetCategoryCreate(name="食物", budget_amount=5000, group_name="Living"), db=db
    )
    assert created.id is not None
    assert created.group_name == "Living"


def test_update_budget_category(db):
    cat = BudgetRepository(db).create(schemas.BudgetCategoryCreate(name="食物", budget_amount=5000))
    updated = budgets_router.update_budget_category(
        cat.id, schemas.BudgetCategoryUpdate(budget_amount=6000), db=db
    )
    assert updated.budget_amount == 6000


def test_update_budget_category_missing_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        budgets_router.update_budget_category(9999, schemas.BudgetCategoryUpdate(name="X"), db=db)
    assert exc_info.value.status_code == 404


def test_delete_budget_category(db):
    cat = BudgetRepository(db).create(schemas.BudgetCategoryCreate(name="食物", budget_amount=5000))
    budgets_router.delete_budget_category(cat.id, db=db)
    assert BudgetRepository(db).get(cat.id) is None


def test_delete_budget_category_missing_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        budgets_router.delete_budget_category(9999, db=db)
    assert exc_info.value.status_code == 404


def test_list_budget_categories(db):
    BudgetRepository(db).create(schemas.BudgetCategoryCreate(name="食物", budget_amount=5000))
    BudgetRepository(db).create(schemas.BudgetCategoryCreate(name="交通", budget_amount=2000))
    assert len(budgets_router.get_budget_categories(db=db)) == 2


# ── Income ────────────────────────────────────────────────────────────────────

def test_create_income_item(db):
    created = income_router.create_income_item(schemas.IncomeItemCreate(name="Salary", amount=50_000), db=db)
    assert created.id is not None


def test_update_income_item(db):
    item = IncomeRepository(db).create(schemas.IncomeItemCreate(name="Salary", amount=50_000))
    updated = income_router.update_income_item(item.id, schemas.IncomeItemUpdate(amount=55_000), db=db)
    assert updated.amount == 55_000


def test_update_income_item_missing_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        income_router.update_income_item(9999, schemas.IncomeItemUpdate(name="X"), db=db)
    assert exc_info.value.status_code == 404


def test_delete_income_item(db):
    item = IncomeRepository(db).create(schemas.IncomeItemCreate(name="Salary", amount=50_000))
    income_router.delete_income_item(item.id, db=db)
    assert IncomeRepository(db).get(item.id) is None


def test_delete_income_item_missing_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        income_router.delete_income_item(9999, db=db)
    assert exc_info.value.status_code == 404
