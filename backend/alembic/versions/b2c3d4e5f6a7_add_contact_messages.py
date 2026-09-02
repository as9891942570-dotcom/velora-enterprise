"""add contact messages

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-09-02 14:30:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "a1b2c3d4e5f6"

branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    status_enum = postgresql.ENUM(
        "unread",
        "read",
        "resolved",
        name="contact_message_status",
        create_type=False,
    )

    # Create ENUM only if it does not already exist
    status_enum.create(bind, checkfirst=True)

    op.create_table(
        "contact_messages",
        sa.Column("id", sa.UUID(), nullable=False),

        sa.Column(
            "name",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "email",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "subject",
            sa.String(length=255),
            nullable=False,
        ),

        sa.Column(
            "message",
            sa.Text(),
            nullable=False,
        ),

        sa.Column(
            "status",
            status_enum,
            nullable=False,
            server_default="unread",
        ),

        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),

        sa.PrimaryKeyConstraint("id"),
    )

    op.create_index(
        op.f("ix_contact_messages_email"),
        "contact_messages",
        ["email"],
        unique=False,
    )

    op.create_index(
        op.f("ix_contact_messages_status"),
        "contact_messages",
        ["status"],
        unique=False,
    )

    op.create_index(
        op.f("ix_contact_messages_created_at"),
        "contact_messages",
        ["created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_contact_messages_created_at"),
        table_name="contact_messages",
    )

    op.drop_index(
        op.f("ix_contact_messages_status"),
        table_name="contact_messages",
    )

    op.drop_index(
        op.f("ix_contact_messages_email"),
        table_name="contact_messages",
    )

    op.drop_table("contact_messages")

    bind = op.get_bind()

    status_enum = postgresql.ENUM(
        "unread",
        "read",
        "resolved",
        name="contact_message_status",
    )

    status_enum.drop(bind, checkfirst=True)