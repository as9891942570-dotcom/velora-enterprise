"""add google sub to users

Revision ID: 50d9675cc39c
Revises: b8c9d0e1f2a3
Create Date: 2026-09-05 14:05:04.856190

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '50d9675cc39c'
down_revision: Union[str, None] = 'b8c9d0e1f2a3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'users',
        sa.Column('google_sub', sa.String(length=255), nullable=True)
    )

    op.create_index(
        op.f('ix_users_google_sub'),
        'users',
        ['google_sub'],
        unique=True
    )


def downgrade() -> None:
    op.drop_index(
        op.f('ix_users_google_sub'),
        table_name='users'
    )

    op.drop_column(
        'users',
        'google_sub'
    )