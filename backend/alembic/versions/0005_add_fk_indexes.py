"""Add indexes on foreign keys that are actually filtered/joined on

Revision ID: 0005
Revises: 0004
Create Date: 2026-09-11

Purely additive — creates indexes only, no column/constraint changes, so
this is safe to run against an existing database with no risk of data loss.
Guarded with existence checks (same style as 0002) so it's idempotent.

Note on scope: this migration deliberately does NOT add NOT NULL
constraints to columns that are always required in practice (e.g.
Asset.name, Goal.target_amount) even though that was considered — SQLite
requires a full table rebuild (via Alembic's batch mode) to change column
nullability, and for a solo self-hosted app where every write already goes
through Pydantic-validated endpoints, that real risk-to-live-data doesn't
pay for itself against the marginal benefit of also enforcing it at the DB
layer. Deferred; see CLAUDE.md's Known Technical Debt section.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: Union[str, None] = "0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_INDEXES = [
    ("ix_assets_connection_id", "assets", "connection_id"),
    ("ix_transactions_asset_id", "transactions", "asset_id"),
    ("ix_subscription_members_subscription_id", "subscription_members", "subscription_id"),
    ("ix_collection_cycles_subscription_id", "collection_cycles", "subscription_id"),
    ("ix_cycle_payments_cycle_id", "cycle_payments", "cycle_id"),
    ("ix_cycle_payments_member_id", "cycle_payments", "member_id"),
]


def _index_exists(table: str, name: str) -> bool:
    bind = op.get_bind()
    return name in {ix["name"] for ix in sa.inspect(bind).get_indexes(table)}


def upgrade() -> None:
    for name, table, column in _INDEXES:
        if not _index_exists(table, name):
            op.create_index(name, table, [column])


def downgrade() -> None:
    for name, table, _column in _INDEXES:
        if _index_exists(table, name):
            op.drop_index(name, table_name=table)
