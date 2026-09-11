"""Goals domain cleanup (docs/specs/goals.md)

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-11

Decision 3: drop `goals.currency` and `goals.description` — both modeled
end-to-end (model/schema/TS type) but never read or written by any UI, with
no comment or plan indicating future use (unlike Settings/System's
confirmed-planned-but-unbuilt keys). `description` briefly held migrated
ASSET_ALLOCATION allocation data pre-`allocation_data` column; that
migration (c85dd4dd1135) already completed, so nothing of value remains in
either column today.

SQLite requires batch mode (table rebuild) to drop columns. Guarded for
both a fresh install (0001 already creates the table without these columns,
since models.py no longer declares them) and an existing production DB
(columns present, gets dropped) — same pattern as migration 0006.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set[str]:
    bind = op.get_bind()
    return {c["name"] for c in sa.inspect(bind).get_columns("goals")}


def upgrade() -> None:
    existing = _existing_columns()
    with op.batch_alter_table("goals") as batch_op:
        if "currency" in existing:
            batch_op.drop_column("currency")
        if "description" in existing:
            batch_op.drop_column("description")


def downgrade() -> None:
    existing = _existing_columns()
    with op.batch_alter_table("goals") as batch_op:
        if "currency" not in existing:
            batch_op.add_column(sa.Column("currency", sa.String(), nullable=True, server_default="TWD"))
        if "description" not in existing:
            batch_op.add_column(sa.Column("description", sa.String(), nullable=True))
