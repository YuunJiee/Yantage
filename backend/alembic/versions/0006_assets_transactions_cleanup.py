"""Assets/Transactions domain cleanup (docs/specs/assets-transactions.md)

Revision ID: 0006
Revises: 0005
Create Date: 2026-09-11

Two changes, both per the Assets/Transactions spec's Explicit Decisions:

- Drop `is_favorite` (Decision 7: dead field, never set by any UI) and
  `manual_avg_cost` (Decision 2: written by MAX sync and editable on the
  Edit Asset form, but read by nothing — a correctness trap next to the
  Add Asset form's differently-wired, working "平均成本" field).
- Data migration: any existing `assets.source = 'web3_wallet'` row is
  updated to `'wallet'` (Decision 5), matching `Provider.WALLET.value` —
  the wallet provider previously wrote the literal string directly instead
  of using the enum, the only provider whose `source` didn't match its
  `Provider` vocabulary.

SQLite requires batch mode (table rebuild) to drop columns; downgrade
re-adds them as nullable (their original values are not recoverable).
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0006"
down_revision: Union[str, None] = "0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns() -> set[str]:
    bind = op.get_bind()
    return {c["name"] for c in sa.inspect(bind).get_columns("assets")}


def upgrade() -> None:
    op.execute("UPDATE assets SET source = 'wallet' WHERE source = 'web3_wallet'")

    # Guarded: on a fresh install, 0001 already creates the table from the
    # current (post-removal) model definition, so these columns won't exist
    # to drop — only a pre-existing production DB has them physically.
    existing = _existing_columns()
    with op.batch_alter_table("assets") as batch_op:
        if "is_favorite" in existing:
            batch_op.drop_column("is_favorite")
        if "manual_avg_cost" in existing:
            batch_op.drop_column("manual_avg_cost")


def downgrade() -> None:
    existing = _existing_columns()
    with op.batch_alter_table("assets") as batch_op:
        if "is_favorite" not in existing:
            batch_op.add_column(sa.Column("is_favorite", sa.Boolean(), nullable=True, server_default=sa.false()))
        if "manual_avg_cost" not in existing:
            batch_op.add_column(sa.Column("manual_avg_cost", sa.Float(), nullable=True))
