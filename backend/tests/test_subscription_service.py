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


# ── docs/specs/subscriptions.md R2: amount pinned at cycle-creation time ─────

def test_create_cycle_payments_have_pinned_amount(db):
    # total_cost=600/month, total_shares=4 -> 150/share/month, x6 months = 900
    sub = _subscription_with_members(db, member_names=("A", "B", "C"))

    cycle = SubscriptionService(db).create_cycle(
        sub.id, schemas.CollectionCycleCreate(cycle_start="2026-01-01")
    )

    assert all(p.amount == 900 for p in cycle.payments)


def test_create_cycle_amount_reflects_subscription_fields_at_creation_not_later(db):
    sub = _subscription_with_members(db, member_names=("A",))

    cycle1 = SubscriptionService(db).create_cycle(
        sub.id, schemas.CollectionCycleCreate(cycle_start="2026-01-01")
    )
    assert cycle1.payments[0].amount == 900

    SubscriptionRepository(db).update(sub.id, schemas.SubscriptionUpdate(total_cost=1200))

    cycle2 = SubscriptionService(db).create_cycle(
        sub.id, schemas.CollectionCycleCreate(cycle_start="2026-02-01")
    )
    assert cycle2.payments[0].amount == 1800

    # cycle1's already-created payment must be untouched by the later edit
    refetched_cycle1 = SubscriptionRepository(db).get_cycle(cycle1.id)
    assert refetched_cycle1.payments[0].amount == 900


def test_compute_per_member_amount_zero_when_total_shares_zero():
    from backend.services.subscription_service import compute_per_member_amount

    class FakeSub:
        total_cost = 600
        total_shares = 0
        collection_period_months = 6

    assert compute_per_member_amount(FakeSub()) == 0
