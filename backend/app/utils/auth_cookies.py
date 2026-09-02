from datetime import datetime, timedelta, timezone

from fastapi import Response

from app.core.config import settings

REFRESH_COOKIE_NAME = "refresh_token"
ADMIN_REFRESH_COOKIE_NAME = "admin_refresh_token"


def set_refresh_cookie(response: Response, token: str) -> None:
    max_age = settings.refresh_token_expire_days * 86400
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=not settings.debug,
        samesite="lax",
        max_age=max_age,
        path="/",
    )


def set_admin_refresh_cookie(response: Response, token: str) -> None:
    max_age = settings.refresh_token_expire_days * 86400
    response.set_cookie(
        key=ADMIN_REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=not settings.debug,
        samesite="lax",
        max_age=max_age,
        path="/",
    )


def clear_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/")


def clear_admin_refresh_cookie(response: Response) -> None:
    response.delete_cookie(key=ADMIN_REFRESH_COOKIE_NAME, path="/")


def refresh_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
