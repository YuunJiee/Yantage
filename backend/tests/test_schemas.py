"""Structural test pinning the bug where *Update schemas silently omitted
fields their *Base schema declared (e.g. AssetUpdate was missing
sub_category, so editing an asset's sub-category via PUT was a silent
no-op — repositories apply updates generically via
``data.dict(exclude_unset=True)``, so a field missing from *Update can
never reach the DB no matter what the frontend sends).

This doesn't assert *Update should have every *Base field (some, like
Asset.name's immutable counterparts, are legitimately excluded) — it just
guards that every *Update field is a real field on its *Base, catching
typos/drift in the other direction too.
"""

from datetime import datetime

import pytest
from pydantic import ValidationError

from backend import schemas

# (Update schema, Base schema, fields *Update is intentionally missing)
UPDATE_BASE_PAIRS = [
    (schemas.TransactionUpdate, schemas.TransactionBase, set()),
    (schemas.AssetUpdate, schemas.AssetBase, {"value_twd", "unrealized_pl", "roi"}),
    (schemas.GoalUpdate, schemas.GoalBase, set()),
    (schemas.BudgetCategoryUpdate, schemas.BudgetCategoryBase, set()),
    (schemas.IncomeItemUpdate, schemas.IncomeItemBase, set()),
    (schemas.SubscriptionUpdate, schemas.SubscriptionBase, set()),
    (schemas.SubscriptionMemberUpdate, schemas.SubscriptionMemberBase, set()),
    (schemas.CyclePaymentUpdate, schemas.CyclePaymentBase, {"member_id", "amount"}),
]


@pytest.mark.parametrize("update_cls,base_cls,intentionally_excluded", UPDATE_BASE_PAIRS)
def test_update_schema_fields_are_subset_of_base(update_cls, base_cls, intentionally_excluded):
    update_fields = set(update_cls.model_fields)
    base_fields = set(base_cls.model_fields)
    assert update_fields <= base_fields, (
        f"{update_cls.__name__} has fields not on {base_cls.__name__}: "
        f"{update_fields - base_fields}"
    )


@pytest.mark.parametrize("update_cls,base_cls,intentionally_excluded", UPDATE_BASE_PAIRS)
def test_update_schema_only_missing_intentionally_excluded_fields(update_cls, base_cls, intentionally_excluded):
    """Catches the AssetUpdate-style bug: a Base field silently missing from Update."""
    update_fields = set(update_cls.model_fields)
    base_fields = set(base_cls.model_fields)
    missing = base_fields - update_fields
    assert missing == intentionally_excluded, (
        f"{update_cls.__name__} is missing {missing - intentionally_excluded} from "
        f"{base_cls.__name__} that isn't in the known-excluded list — "
        f"either add the field to {update_cls.__name__} or add it to "
        f"intentionally_excluded if that's deliberate."
    )


def test_asset_create_rejects_invalid_category():
    with pytest.raises(ValidationError):
        schemas.AssetCreate(name="Cash", category="stok")


def test_connection_create_rejects_invalid_provider():
    with pytest.raises(ValidationError):
        schemas.ConnectionCreate(name="X", provider="coinbase")


def test_goal_create_rejects_invalid_goal_type():
    with pytest.raises(ValidationError):
        schemas.GoalCreate(name="X", target_amount=100, goal_type="NETWORTH")


# ── docs/specs/goals.md Decision 5: target_amount/allocation_data validation ──

def test_goal_create_rejects_zero_target_amount():
    with pytest.raises(ValidationError):
        schemas.GoalCreate(name="X", target_amount=0, goal_type="NET_WORTH")


def test_goal_create_rejects_negative_target_amount():
    with pytest.raises(ValidationError):
        schemas.GoalCreate(name="X", target_amount=-100, goal_type="NET_WORTH")


def test_goal_create_accepts_positive_target_amount():
    goal = schemas.GoalCreate(name="X", target_amount=1, goal_type="NET_WORTH")
    assert goal.target_amount == 1


def test_goal_update_rejects_non_positive_target_amount():
    with pytest.raises(ValidationError):
        schemas.GoalUpdate(target_amount=0)


def test_goal_update_allows_omitting_target_amount():
    update = schemas.GoalUpdate(name="Renamed")
    assert update.target_amount is None


def test_goal_create_rejects_malformed_allocation_json():
    with pytest.raises(ValidationError):
        schemas.GoalCreate(
            name="X", target_amount=100, goal_type="ASSET_ALLOCATION", allocation_data="not json",
        )


def test_goal_create_rejects_allocation_not_summing_to_100():
    with pytest.raises(ValidationError):
        schemas.GoalCreate(
            name="X", target_amount=100, goal_type="ASSET_ALLOCATION",
            allocation_data='{"Stock": 60, "Fluid": 30}',
        )


def test_goal_create_accepts_allocation_summing_to_100():
    goal = schemas.GoalCreate(
        name="X", target_amount=100, goal_type="ASSET_ALLOCATION",
        allocation_data='{"Stock": 60, "Fluid": 40}',
    )
    assert goal.allocation_data == '{"Stock": 60, "Fluid": 40}'


def test_goal_create_accepts_allocation_within_rounding_tolerance():
    goal = schemas.GoalCreate(
        name="X", target_amount=100, goal_type="ASSET_ALLOCATION",
        allocation_data='{"Stock": 60, "Fluid": 40.005}',
    )
    assert goal.allocation_data is not None


def test_goal_update_rejects_allocation_not_summing_to_100():
    with pytest.raises(ValidationError):
        schemas.GoalUpdate(allocation_data='{"Stock": 200}')


# ── docs/specs/budgets-income.md Decision 4/5: budget/income validation ──────

def test_budget_category_create_rejects_negative_amount():
    with pytest.raises(ValidationError):
        schemas.BudgetCategoryCreate(name="食物", budget_amount=-1)


def test_budget_category_create_accepts_zero_amount():
    cat = schemas.BudgetCategoryCreate(name="食物", budget_amount=0)
    assert cat.budget_amount == 0


def test_budget_category_update_rejects_negative_amount():
    with pytest.raises(ValidationError):
        schemas.BudgetCategoryUpdate(budget_amount=-1)


def test_budget_category_create_rejects_invalid_group_name():
    with pytest.raises(ValidationError):
        schemas.BudgetCategoryCreate(name="食物", budget_amount=100, group_name="Random")


def test_budget_category_create_accepts_valid_group_name():
    cat = schemas.BudgetCategoryCreate(name="食物", budget_amount=100, group_name="Living")
    assert cat.group_name == "Living"


def test_budget_category_create_allows_omitted_group_name():
    cat = schemas.BudgetCategoryCreate(name="食物", budget_amount=100)
    assert cat.group_name is None


def test_income_item_create_rejects_negative_amount():
    with pytest.raises(ValidationError):
        schemas.IncomeItemCreate(name="Salary", amount=-1)


def test_income_item_create_accepts_zero_amount():
    item = schemas.IncomeItemCreate(name="Salary", amount=0)
    assert item.amount == 0


def test_income_item_update_rejects_negative_amount():
    with pytest.raises(ValidationError):
        schemas.IncomeItemUpdate(amount=-1)


# ── docs/specs/subscriptions.md R6: Subscription validation ──────────────────

def _sub_kwargs(**overrides):
    base = dict(name="Netflix", total_cost=600, total_shares=4, my_shares=1)
    base.update(overrides)
    return base


def test_subscription_create_rejects_negative_total_cost():
    with pytest.raises(ValidationError):
        schemas.SubscriptionCreate(**_sub_kwargs(total_cost=-1))


def test_subscription_create_accepts_zero_total_cost():
    sub = schemas.SubscriptionCreate(**_sub_kwargs(total_cost=0))
    assert sub.total_cost == 0


def test_subscription_create_rejects_zero_total_shares():
    with pytest.raises(ValidationError):
        schemas.SubscriptionCreate(**_sub_kwargs(total_shares=0))


def test_subscription_create_rejects_zero_my_shares():
    with pytest.raises(ValidationError):
        schemas.SubscriptionCreate(**_sub_kwargs(my_shares=0))


def test_subscription_create_rejects_my_shares_greater_than_total_shares():
    with pytest.raises(ValidationError):
        schemas.SubscriptionCreate(**_sub_kwargs(total_shares=2, my_shares=3))


def test_subscription_create_accepts_my_shares_equal_to_total_shares():
    sub = schemas.SubscriptionCreate(**_sub_kwargs(total_shares=2, my_shares=2))
    assert sub.my_shares == 2


def test_subscription_update_rejects_my_shares_greater_than_total_shares_when_both_given():
    with pytest.raises(ValidationError):
        schemas.SubscriptionUpdate(total_shares=2, my_shares=3)


def test_subscription_update_allows_only_total_shares():
    update = schemas.SubscriptionUpdate(total_shares=5)
    assert update.total_shares == 5


def test_subscription_update_rejects_negative_total_cost():
    with pytest.raises(ValidationError):
        schemas.SubscriptionUpdate(total_cost=-1)


# ── docs/specs/subscriptions.md Decision 4: member rename ────────────────────

def test_subscription_member_update_accepts_name():
    update = schemas.SubscriptionMemberUpdate(name="New Name")
    assert update.name == "New Name"


# ── Response schemas must serialize pre-existing rows that violate ───────────
# ── write-time validation added in this rewrite series, or the whole ────────
# ── GET list endpoint 500s for every user whose data predates it. ───────────
# (Regression for a real production incident: GET /api/goals/ 500'd for a
# user with a legacy goal whose data no longer satisfied the new Field/
# validator constraints on GoalBase, because the Goal response schema used
# to inherit from GoalBase.)

def test_goal_response_serializes_legacy_zero_target_amount():
    goal = schemas.Goal(
        id=1, name="Old Goal", target_amount=0, goal_type="NET_WORTH",
        allocation_data=None, created_at=datetime.now(),
    )
    assert goal.target_amount == 0


def test_goal_response_serializes_legacy_non_json_allocation_data():
    """Pins the exact scenario the frontend's parseAllocation already
    documents as legacy pre-migration data: allocation_data stored as a
    bare category-name string instead of a JSON object."""
    goal = schemas.Goal(
        id=1, name="Old Allocation Goal", target_amount=100, goal_type="ASSET_ALLOCATION",
        allocation_data="Stock", created_at=datetime.now(),
    )
    assert goal.allocation_data == "Stock"


def test_goal_response_serializes_legacy_goal_type_outside_the_enum():
    """Confirmed in production: a goal predating the two-value GoalType
    enum had goal_type='MONTHLY_SPENDING', 500ing GET /api/goals/."""
    goal = schemas.Goal(
        id=2, name="Old Monthly Budget Goal", target_amount=12000, goal_type="MONTHLY_SPENDING",
        allocation_data=None, created_at=datetime.now(),
    )
    assert goal.goal_type == "MONTHLY_SPENDING"


def test_budget_category_response_serializes_legacy_negative_amount():
    cat = schemas.BudgetCategory(
        id=1, name="Old Category", budget_amount=-100, created_at=datetime.now(),
    )
    assert cat.budget_amount == -100


def test_budget_category_response_serializes_legacy_unknown_group_name():
    cat = schemas.BudgetCategory(
        id=1, name="Old Category", budget_amount=100, group_name="SomethingElse",
        created_at=datetime.now(),
    )
    assert cat.group_name == "SomethingElse"


def test_income_item_response_serializes_legacy_negative_amount():
    item = schemas.IncomeItem(id=1, name="Old Income", amount=-50, created_at=datetime.now())
    assert item.amount == -50


def test_subscription_response_serializes_legacy_zero_total_shares():
    sub = schemas.Subscription(
        id=1, name="Old Sub", total_cost=100, total_shares=0, my_shares=0,
        collection_period_months=6, created_at=datetime.now(),
    )
    assert sub.total_shares == 0


def test_subscription_response_serializes_legacy_my_shares_greater_than_total():
    sub = schemas.Subscription(
        id=1, name="Old Sub", total_cost=100, total_shares=2, my_shares=5,
        collection_period_months=6, created_at=datetime.now(),
    )
    assert sub.my_shares == 5
