"""fix order_status enum label for cancellation_requested

Revision ID: a7b8c9d0e1f2
Revises: f6a7b8c9d0e1
Create Date: 2026-09-03 23:00:00.000000

The initial schema stores order_status as UPPERCASE enum names (PENDING, …).
A previous migration incorrectly added lowercase 'cancellation_requested'.
SQLAlchemy binds OrderStatus.CANCELLATION_REQUESTED as 'CANCELLATION_REQUESTED'.
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, None] = "f6a7b8c9d0e1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'CANCELLATION_REQUESTED'"))
    op.add_column(
        "orders",
        sa.Column("stock_restored", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )


def downgrade() -> None:
    op.drop_column("orders", "stock_restored")
    # PostgreSQL cannot remove enum values safely; leave CANCELLATION_REQUESTED in place.
