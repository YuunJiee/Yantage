"""Router-level tests for the Subscriptions domain — previously had zero
coverage beyond the two incidental system-reset hits in test_http_contracts.py
(docs/specs/subscriptions.md)."""

import pytest
from fastapi import HTTPException

from backend import schemas
from backend.repositories.subscription_repo import SubscriptionRepository
from backend.routers import subscriptions as subs_router


def _create_sub(db, **overrides):
    kwargs = dict(name="Netflix", total_cost=600, total_shares=4, my_shares=1,
                  members=[schemas.SubscriptionMemberCreate(name="A")])
    kwargs.update(overrides)
    return SubscriptionRepository(db).create(schemas.SubscriptionCreate(**kwargs))


# ── Subscription CRUD ─────────────────────────────────────────────────────────

def test_create_subscription(db):
    created = subs_router.create_subscription(
        schemas.SubscriptionCreate(name="Netflix", total_cost=600, total_shares=4, my_shares=1), db=db
    )
    assert created.id is not None


def test_update_subscription_name_and_cost_allowed(db):
    sub = _create_sub(db)
    updated = subs_router.update_subscription(
        sub.id, schemas.SubscriptionUpdate(name="Netflix Premium", total_cost=800), db=db
    )
    assert updated.name == "Netflix Premium"
    assert updated.total_cost == 800


@pytest.mark.parametrize("field,value", [("total_shares", 5), ("my_shares", 2), ("collection_period_months", 3)])
def test_update_subscription_rejects_changing_locked_fields(db, field, value):
    sub = _create_sub(db)
    with pytest.raises(HTTPException) as exc_info:
        subs_router.update_subscription(sub.id, schemas.SubscriptionUpdate(**{field: value}), db=db)
    assert exc_info.value.status_code == 422


def test_update_subscription_allows_sending_the_same_locked_field_values(db):
    sub = _create_sub(db)
    updated = subs_router.update_subscription(
        sub.id,
        schemas.SubscriptionUpdate(total_shares=sub.total_shares, my_shares=sub.my_shares,
                                     collection_period_months=sub.collection_period_months),
        db=db,
    )
    assert updated.total_shares == sub.total_shares


def test_update_subscription_missing_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        subs_router.update_subscription(9999, schemas.SubscriptionUpdate(name="X"), db=db)
    assert exc_info.value.status_code == 404


def test_delete_subscription(db):
    sub = _create_sub(db)
    subs_router.delete_subscription(sub.id, db=db)
    assert SubscriptionRepository(db).get(sub.id) is None


def test_delete_subscription_missing_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        subs_router.delete_subscription(9999, db=db)
    assert exc_info.value.status_code == 404


# ── Members ───────────────────────────────────────────────────────────────────

def test_add_member(db):
    sub = _create_sub(db)
    member = subs_router.add_member(sub.id, schemas.SubscriptionMemberCreate(name="B"), db=db)
    assert member.name == "B"


def test_add_member_missing_subscription_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        subs_router.add_member(9999, schemas.SubscriptionMemberCreate(name="B"), db=db)
    assert exc_info.value.status_code == 404


def test_rename_member(db):
    sub = _create_sub(db)
    member = sub.members[0]
    renamed = subs_router.update_member(member.id, schemas.SubscriptionMemberUpdate(name="Renamed"), db=db)
    assert renamed.name == "Renamed"


def test_rename_member_missing_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        subs_router.update_member(9999, schemas.SubscriptionMemberUpdate(name="X"), db=db)
    assert exc_info.value.status_code == 404


def test_delete_member(db):
    sub = _create_sub(db)
    member = sub.members[0]
    subs_router.delete_member(member.id, db=db)
    with pytest.raises(HTTPException):
        subs_router.update_member(member.id, schemas.SubscriptionMemberUpdate(name="X"), db=db)


def test_delete_member_missing_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        subs_router.delete_member(9999, db=db)
    assert exc_info.value.status_code == 404


# ── Cycles ────────────────────────────────────────────────────────────────────

def test_create_cycle(db):
    sub = _create_sub(db)
    cycle = subs_router.create_cycle(sub.id, schemas.CollectionCycleCreate(cycle_start="2026-01-01"), db=db)
    assert len(cycle.payments) == 1


def test_create_cycle_missing_subscription_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        subs_router.create_cycle(9999, schemas.CollectionCycleCreate(cycle_start="2026-01-01"), db=db)
    assert exc_info.value.status_code == 404


def test_delete_cycle(db):
    sub = _create_sub(db)
    cycle = subs_router.create_cycle(sub.id, schemas.CollectionCycleCreate(cycle_start="2026-01-01"), db=db)
    subs_router.delete_cycle(cycle.id, db=db)


def test_delete_cycle_missing_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        subs_router.delete_cycle(9999, db=db)
    assert exc_info.value.status_code == 404


# ── Payments ──────────────────────────────────────────────────────────────────

def test_mark_payment_paid_and_unpaid(db):
    sub = _create_sub(db)
    cycle = subs_router.create_cycle(sub.id, schemas.CollectionCycleCreate(cycle_start="2026-01-01"), db=db)
    payment = cycle.payments[0]

    paid = subs_router.update_payment(payment.id, schemas.CyclePaymentUpdate(paid_at="2026-01-15"), db=db)
    assert paid.paid_at == "2026-01-15"

    unpaid = subs_router.update_payment(payment.id, schemas.CyclePaymentUpdate(paid_at=None), db=db)
    assert unpaid.paid_at is None


def test_update_payment_missing_returns_404(db):
    with pytest.raises(HTTPException) as exc_info:
        subs_router.update_payment(9999, schemas.CyclePaymentUpdate(paid_at="2026-01-15"), db=db)
    assert exc_info.value.status_code == 404
