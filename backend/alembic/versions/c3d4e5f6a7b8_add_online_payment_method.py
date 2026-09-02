"""Add online payment method enum value."""

from alembic import op

revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'online'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values safely.
    pass
