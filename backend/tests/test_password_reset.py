"""Schema/unit tests for password reset and email helpers."""

from pydantic import ValidationError
import pytest

from app.schemas.auth import ForgotPasswordRequest, ResetPasswordRequest
from app.services.password_reset_service import GENERIC_FORGOT_MESSAGE


def test_forgot_password_requires_email():
    with pytest.raises(ValidationError):
        ForgotPasswordRequest(email="not-an-email")


def test_reset_password_requires_match():
    with pytest.raises(ValidationError):
        ResetPasswordRequest(
            token="a" * 32,
            password="password123",
            confirm_password="different123",
        )


def test_reset_password_min_length():
    with pytest.raises(ValidationError):
        ResetPasswordRequest(
            token="a" * 32,
            password="short",
            confirm_password="short",
        )


def test_reset_password_valid():
    body = ResetPasswordRequest(
        token="a" * 32,
        password="password123",
        confirm_password="password123",
    )
    assert body.password == "password123"


def test_generic_forgot_message_is_safe():
    assert "If an account exists" in GENERIC_FORGOT_MESSAGE
