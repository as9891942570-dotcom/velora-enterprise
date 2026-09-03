"""reviews, admin_seen_at, cancellation request fields

Revision ID: f6a7b8c9d0e1
Revises: 8f01d2069343
Create Date: 2026-09-03 22:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, None] = "8f01d2069343"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # order_status PG enum uses member NAMES (PENDING, CONFIRMED, ...), matching SQLAlchemy Enum defaults.
    op.execute(sa.text("ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'CANCELLATION_REQUESTED'"))

    cancellation_decision = postgresql.ENUM(
        "pending",
        "approved",
        "rejected",
        name="cancellation_decision",
        create_type=False,
    )
    cancellation_decision.create(op.get_bind(), checkfirst=True)

    op.add_column("orders", sa.Column("cancellation_requested_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("orders", sa.Column("cancellation_reviewed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("orders", sa.Column("cancellation_reviewed_by_user_id", sa.UUID(), nullable=True))
    op.add_column("orders", sa.Column("cancellation_admin_note", sa.Text(), nullable=True))
    op.add_column("orders", sa.Column("cancellation_decision", cancellation_decision, nullable=True))
    op.add_column("orders", sa.Column("admin_seen_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_orders_cancellation_decision", "orders", ["cancellation_decision"])
    op.create_index("ix_orders_admin_seen_at", "orders", ["admin_seen_at"])
    op.create_foreign_key(
        "fk_orders_cancellation_reviewed_by_user_id",
        "orders",
        "users",
        ["cancellation_reviewed_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "product_reviews",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("order_id", sa.UUID(), nullable=False),
        sa.Column("rating", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=False),
        sa.Column("admin_reply", sa.Text(), nullable=True),
        sa.Column("is_read", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_hidden", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "product_id", "order_id", name="uq_review_user_product_order"),
    )
    op.create_index("ix_product_reviews_user_id", "product_reviews", ["user_id"])
    op.create_index("ix_product_reviews_product_id", "product_reviews", ["product_id"])
    op.create_index("ix_product_reviews_order_id", "product_reviews", ["order_id"])
    op.create_index("ix_product_reviews_is_read", "product_reviews", ["is_read"])


def downgrade() -> None:
    op.drop_index("ix_product_reviews_is_read", table_name="product_reviews")
    op.drop_index("ix_product_reviews_order_id", table_name="product_reviews")
    op.drop_index("ix_product_reviews_product_id", table_name="product_reviews")
    op.drop_index("ix_product_reviews_user_id", table_name="product_reviews")
    op.drop_table("product_reviews")

    op.drop_constraint("fk_orders_cancellation_reviewed_by_user_id", "orders", type_="foreignkey")
    op.drop_index("ix_orders_admin_seen_at", table_name="orders")
    op.drop_index("ix_orders_cancellation_decision", table_name="orders")
    op.drop_column("orders", "admin_seen_at")
    op.drop_column("orders", "cancellation_decision")
    op.drop_column("orders", "cancellation_admin_note")
    op.drop_column("orders", "cancellation_reviewed_by_user_id")
    op.drop_column("orders", "cancellation_reviewed_at")
    op.drop_column("orders", "cancellation_requested_at")
    postgresql.ENUM(name="cancellation_decision").drop(op.get_bind(), checkfirst=True)
