"""Initial schema — create all tables

Revision ID: 0001
Revises:
Create Date: 2026-03-25

Safe to run on both fresh and existing databases: create_all(checkfirst=True)
skips tables that already exist.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    from backend.models import Base
    Base.metadata.create_all(bind=bind, checkfirst=True)


def downgrade() -> None:
    pass  # Dropping all tables in production is intentionally not automated.
