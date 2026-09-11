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
    (schemas.CyclePaymentUpdate, schemas.CyclePaymentBase, {"member_id"}),
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
