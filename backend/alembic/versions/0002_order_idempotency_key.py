"""add order idempotency_key

Revision ID: 0002_order_idempotency_key
Revises: 0001_initial
Create Date: 2026-05-20 00:00:00
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "0002_order_idempotency_key"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("idempotency_key", sa.String(length=80), nullable=True),
    )
    # Unique per (user, key): same key from the same user => same order.
    op.create_index(
        "uq_orders_user_idempotency",
        "orders",
        ["user_id", "idempotency_key"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_orders_user_idempotency", table_name="orders")
    op.drop_column("orders", "idempotency_key")
