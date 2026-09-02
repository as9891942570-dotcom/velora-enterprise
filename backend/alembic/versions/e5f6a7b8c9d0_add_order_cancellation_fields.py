"""add order cancellation fields

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-02 18:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, None] = "d4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    cancelled_by_role = sa.Enum("customer", "admin", "system", name="cancelled_by_role")
    cancelled_by_role.create(op.get_bind(), checkfirst=True)

    op.add_column("orders", sa.Column("cancelled_by_user_id", sa.UUID(), nullable=True))
    op.add_column(
        "orders",
        sa.Column("cancelled_by_role", cancelled_by_role, nullable=True),
    )
    op.add_column("orders", sa.Column("cancellation_reason", sa.Text(), nullable=True))
    op.add_column(
        "orders",
        sa.Column(
            "status_before_cancel",
            sa.Enum(
                "pending",
                "confirmed",
                "processing",
                "shipped",
                "out_for_delivery",
                "delivered",
                "cancelled",
                "returned",
                name="order_status",
                create_type=False,
            ),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_orders_cancelled_by_user_id",
        "orders",
        "users",
        ["cancelled_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_orders_cancelled_by_user_id", "orders", type_="foreignkey")
    op.drop_column("orders", "status_before_cancel")
    op.drop_column("orders", "cancellation_reason")
    op.drop_column("orders", "cancelled_by_role")
    op.drop_column("orders", "cancelled_by_user_id")
    sa.Enum(name="cancelled_by_role").drop(op.get_bind(), checkfirst=True)
