"""Add subscription split tables

Revision ID: 0004
Revises: c85dd4dd1135
Create Date: 2026-06-06
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table: str) -> bool:
    bind = op.get_bind()
    return table in sa.inspect(bind).get_table_names()


def upgrade() -> None:
    # Guarded: on a fresh install, migration 0001's create_all() already
    # creates these tables by reading the current models.py, which already
    # declares Subscription/SubscriptionMember/CollectionCycle/CyclePayment.
    if not _table_exists("subscriptions"):
        op.create_table(
            "subscriptions",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("name", sa.String(), index=True),
            sa.Column("total_cost", sa.Float(), nullable=False),
            sa.Column("total_shares", sa.Integer(), nullable=False),
            sa.Column("my_shares", sa.Integer(), nullable=False),
            sa.Column("collection_period_months", sa.Integer(), default=6),
            sa.Column("created_at", sa.DateTime()),
        )

    if not _table_exists("subscription_members"):
        op.create_table(
            "subscription_members",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("subscription_id", sa.Integer(), sa.ForeignKey("subscriptions.id")),
            sa.Column("name", sa.String(), nullable=False),
        )

    if not _table_exists("collection_cycles"):
        op.create_table(
            "collection_cycles",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("subscription_id", sa.Integer(), sa.ForeignKey("subscriptions.id")),
            sa.Column("cycle_start", sa.String(), nullable=False),
            sa.Column("note", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime()),
        )

    if not _table_exists("cycle_payments"):
        op.create_table(
            "cycle_payments",
            sa.Column("id", sa.Integer(), primary_key=True, index=True),
            sa.Column("cycle_id", sa.Integer(), sa.ForeignKey("collection_cycles.id")),
            sa.Column("member_id", sa.Integer(), sa.ForeignKey("subscription_members.id")),
            sa.Column("paid_at", sa.String(), nullable=True),
            sa.Column("note", sa.String(), nullable=True),
        )


def downgrade() -> None:
    op.drop_table("cycle_payments")
    op.drop_table("collection_cycles")
    op.drop_table("subscription_members")
    op.drop_table("subscriptions")
