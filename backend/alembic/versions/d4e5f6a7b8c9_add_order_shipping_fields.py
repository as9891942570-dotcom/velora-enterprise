"""Add order shipping and status timestamp fields."""

import sqlalchemy as sa
from alembic import op

revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("orders", sa.Column("shipping_partner", sa.String(255), nullable=True))
    op.add_column("orders", sa.Column("tracking_number", sa.String(255), nullable=True))
    op.add_column("orders", sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("orders", sa.Column("processing_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("orders", sa.Column("shipped_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("orders", sa.Column("out_for_delivery_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("orders", sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("orders", sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("orders", "cancelled_at")
    op.drop_column("orders", "delivered_at")
    op.drop_column("orders", "out_for_delivery_at")
    op.drop_column("orders", "shipped_at")
    op.drop_column("orders", "processing_at")
    op.drop_column("orders", "confirmed_at")
    op.drop_column("orders", "tracking_number")
    op.drop_column("orders", "shipping_partner")
