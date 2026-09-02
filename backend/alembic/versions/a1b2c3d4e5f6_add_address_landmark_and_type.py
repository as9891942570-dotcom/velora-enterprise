"""add address landmark and type

Revision ID: a1b2c3d4e5f6
Revises: 994d5acc0954
Create Date: 2026-09-02 12:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "994d5acc0954"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    address_type = sa.Enum("home", "work", "other", name="address_type")
    address_type.create(op.get_bind(), checkfirst=True)
    op.add_column("addresses", sa.Column("landmark", sa.String(length=255), nullable=True))
    op.add_column(
        "addresses",
        sa.Column("address_type", address_type, nullable=False, server_default="home"),
    )


def downgrade() -> None:
    op.drop_column("addresses", "address_type")
    op.drop_column("addresses", "landmark")
    sa.Enum(name="address_type").drop(op.get_bind(), checkfirst=True)
