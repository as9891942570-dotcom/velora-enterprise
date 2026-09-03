"""Password reset request/consume flows for customer and admin scopes."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.security import create_refresh_token_value, hash_password, hash_token
from app.models.enums import UserRole
from app.models.password_reset_token import PasswordResetToken
from app.models.user import User
from app.services import email_service

logger = logging.getLogger(__name__)

GENERIC_FORGOT_MESSAGE = (
    "If an account exists for that email, a password reset link has been sent."
)


def _expected_role(scope: str) -> UserRole:
    return UserRole.ADMIN if scope == "admin" else UserRole.CUSTOMER


def _reset_path(scope: str) -> str:
    return "/admin/reset-password" if scope == "admin" else "/reset-password"


async def request_password_reset(db: AsyncSession, *, email: str, scope: str) -> str:
    """Create a reset token and email the link. Always returns a generic message."""
    role = _expected_role(scope)
    result = await db.execute(select(User).where(User.email.ilike(email.strip())))
    user = result.scalar_one_or_none()

    if not user or not user.is_active or user.role != role:
        return GENERIC_FORGOT_MESSAGE

    # Invalidate previous unused tokens for this user+scope
    now = datetime.now(timezone.utc)
    await db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.scope == scope,
            PasswordResetToken.used_at.is_(None),
        )
        .values(used_at=now)
    )

    raw_token = create_refresh_token_value()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=hash_token(raw_token),
            scope=scope,
            expires_at=now + timedelta(minutes=settings.password_reset_expire_minutes),
        )
    )
    await db.flush()

    reset_url = f"{settings.frontend_url.rstrip('/')}{_reset_path(scope)}?token={raw_token}"
    if settings.debug:
        logger.info("Password reset link generated for scope=%s (debug): %s", scope, reset_url)
    sent = email_service.send_password_reset_email(
        to_email=user.email,
        name=user.name,
        reset_url=reset_url,
        scope=scope,
    )
    if not sent:
        logger.warning("Password reset email not delivered for user_id=%s scope=%s", user.id, scope)

    return GENERIC_FORGOT_MESSAGE


async def reset_password(
    db: AsyncSession,
    *,
    token: str,
    password: str,
    confirm_password: str,
    scope: str,
) -> str:
    if password != confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password confirmation does not match",
        )
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    token_hash = hash_token(token)
    result = await db.execute(
        select(PasswordResetToken)
        .options(selectinload(PasswordResetToken.user))
        .where(PasswordResetToken.token_hash == token_hash)
    )
    stored = result.scalar_one_or_none()
    now = datetime.now(timezone.utc)

    if not stored or stored.scope != scope:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )
    if stored.used_at is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has already been used",
        )
    if stored.expires_at < now:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This reset link has expired",
        )

    user = stored.user
    expected_role = _expected_role(scope)
    if not user or not user.is_active or user.role != expected_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    user.password_hash = hash_password(password)
    stored.used_at = now
    await db.flush()
    return "Password reset successfully. You can now sign in."
