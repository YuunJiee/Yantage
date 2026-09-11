"""Subscriptions domain cleanup (docs/specs/subscriptions.md)

Revision ID: 0009
Revises: 0008
Create Date: 2026-09-11

Decision 2: add `cycle_payments.amount`, pinning each payment's charge at
the moment its cycle was created (SubscriptionService.create_cycle) instead
of always recomputing live from the subscription's *current* fields —
previously, editing a subscription's total_cost retroactively changed what
every past cycle, including already-paid ones, displayed as owed.

For rows that already existed before this migration (created by the old
recompute-live behavior), there is no way to recover the *true* historical
total_cost at the time each cycle was actually created — the backfill below
approximates it using each subscription's *current* fields at migration
time, which is the best available approximation, not a guarantee of
historical accuracy for pre-existing data (see docs/specs/subscriptions.md
Non-Goals).

Decision 7: drop `cycle_payments.note` — modeled and PATCH-reachable but
never read, displayed, or set by any UI.

SQLite requires batch mode (table rebuild) to drop columns. Guarded for both
a fresh install (0001 already creates the table via the current models.py,
which has `amount` and not `note`) and an existing production DB (`note`
present, gets dropped; `amount` absent, gets added and backfilled) — same
pattern as migrations 0006-0008.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0009"
down_revision: Union[str, None] = "0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in {c["name"] for c in sa.inspect(bind).get_columns(table)}


def upgrade() -> None:
    if not _has_column("cycle_payments", "amount"):
        op.add_column("cycle_payments", sa.Column("amount", sa.Float(), nullable=True))

    # Idempotent: only fills rows that don't already have an amount, so this
    # is safe whether the column was just added here or already existed
    # (fresh install — zero rows to touch either way).
    op.execute(sa.text("""
        UPDATE cycle_payments
        SET amount = (
            SELECT CASE WHEN s.total_shares > 0
                        THEN (s.total_cost * 1.0 / s.total_shares) * s.collection_period_months
                        ELSE 0 END
            FROM collection_cycles c
            JOIN subscriptions s ON s.id = c.subscription_id
            WHERE c.id = cycle_payments.cycle_id
        )
        WHERE amount IS NULL
    """))

    if _has_column("cycle_payments", "note"):
        with op.batch_alter_table("cycle_payments") as batch_op:
            batch_op.drop_column("note")


def downgrade() -> None:
    if not _has_column("cycle_payments", "note"):
        with op.batch_alter_table("cycle_payments") as batch_op:
            batch_op.add_column(sa.Column("note", sa.String(), nullable=True))
    if _has_column("cycle_payments", "amount"):
        with op.batch_alter_table("cycle_payments") as batch_op:
            batch_op.drop_column("amount")
