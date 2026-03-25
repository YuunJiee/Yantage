"""Add columns that were applied via hand-rolled migrations

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-25

Each op is guarded by a column-existence check so this migration is
idempotent and safe to run against databases that already have these columns.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _column_exists(table: str, column: str) -> bool:
    bind = op.get_bind()
    cols = [c["name"] for c in sa.inspect(bind).get_columns(table)]
    return column in cols


def upgrade() -> None:
    if not _column_exists("assets", "connection_id"):
        op.add_column("assets", sa.Column("connection_id", sa.Integer(), nullable=True))

    if not _column_exists("budget_categories", "group_name"):
        op.add_column("budget_categories", sa.Column("group_name", sa.String(), nullable=True))

    if not _column_exists("transactions", "note"):
        op.add_column("transactions", sa.Column("note", sa.String(), nullable=True))


def downgrade() -> None:
    pass  # SQLite has limited ALTER TABLE support; skipping DROP COLUMN.
