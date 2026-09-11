"""Tests for SubscriptionService — the auto-create-a-payment-per-member
business rule extracted out of SubscriptionRepository.create_cycle() to fix
a layering violation (repositories must only run SQLAlchemy, not decide
business rules)."""

from backend import schemas
from backend.repositories.subscription_repo import SubscriptionRepository
from backend.services.subscription_service import SubscriptionService


def _subscription_with_members(db, member_names=("A", "B", "C")):
    return SubscriptionRepository(db).create(schemas.SubscriptionCreate(
        name="Netflix",
        total_cost=600,
        total_shares=4,
        my_shares=1,
        members=[schemas.SubscriptionMemberCreate(name=n) for n in member_names],
    ))


def test_create_cycle_creates_one_unpaid_payment_per_member(db):
    sub = _subscription_with_members(db)

    cycle = SubscriptionService(db).create_cycle(
        sub.id, schemas.CollectionCycleCreate(cycle_start="2026-01-01")
    )

    assert cycle is not None
    assert len(cycle.payments) == 3
    assert all(p.paid_at is None for p in cycle.payments)
    assert {p.member.name for p in cycle.payments} == {"A", "B", "C"}


def test_create_cycle_with_no_members_creates_empty_cycle(db):
    sub = _subscription_with_members(db, member_names=())

    cycle = SubscriptionService(db).create_cycle(
        sub.id, schemas.CollectionCycleCreate(cycle_start="2026-01-01")
    )

    assert cycle is not None
    assert cycle.payments == []


def test_create_cycle_missing_subscription_returns_none(db):
    result = SubscriptionService(db).create_cycle(
        9999, schemas.CollectionCycleCreate(cycle_start="2026-01-01")
    )
    assert result is None


def test_create_cycle_persists_note(db):
    sub = _subscription_with_members(db, member_names=("A",))

    cycle = SubscriptionService(db).create_cycle(
        sub.id, schemas.CollectionCycleCreate(cycle_start="2026-01-01", note="首月")
    )

    assert cycle.note == "首月"


def test_subscription_repo_has_no_create_cycle_method():
    """SubscriptionRepository must stay pure-SQL — the business rule
    (auto-creating payments) belongs on SubscriptionService only."""
    assert not hasattr(SubscriptionRepository, "create_cycle")
