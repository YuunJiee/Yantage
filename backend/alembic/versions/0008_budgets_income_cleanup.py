"""Budgets & Income domain cleanup (docs/specs/budgets-income.md)

Revision ID: 0008
Revises: 0007
Create Date: 2026-09-11

Decision 2: drop `is_active` from `budget_categories` and `income_items` —
a soft-delete flag that's DB-backed and filtered-on-read but never actually
set to False by any UI; the app's real delete has always been the hard
DELETE endpoint running alongside it.

SQLite requires batch mode (table rebuild) to drop columns. Guarded for
both a fresh install (0001 already creates these tables without the column,
since models.py no longer declares it) and an existing production DB
(column present, gets dropped) — same pattern as migrations 0006/0007.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_TABLES = ["budget_categories", "income_items"]


def _has_column(table: str, column: str) -> bool:
    bind = op.get_bind()
    return column in {c["name"] for c in sa.inspect(bind).get_columns(table)}


def upgrade() -> None:
    for table in _TABLES:
        if _has_column(table, "is_active"):
            with op.batch_alter_table(table) as batch_op:
                batch_op.drop_column("is_active")


def downgrade() -> None:
    for table in _TABLES:
        if not _has_column(table, "is_active"):
            with op.batch_alter_table(table) as batch_op:
                batch_op.add_column(sa.Column("is_active", sa.Boolean(), nullable=True, server_default=sa.true()))
