"""Tests for Resend-backed email service (no live API calls)."""

from unittest.mock import MagicMock, patch

from app.core.config import settings
from app.services import email_service


def test_send_email_skips_when_api_key_missing():
    with patch.object(settings, "resend_api_key", ""):
        assert email_service.send_email(
            to_email="customer@example.com",
            subject="Test",
            text_body="Hello",
        ) is False


def test_send_email_uses_resend_when_configured():
    mock_send = MagicMock(return_value={"id": "email_123"})
    with (
        patch.object(settings, "resend_api_key", "re_test_key"),
        patch.object(settings, "email_from", "Velora Enterprise <onboarding@resend.dev>"),
        patch("app.services.email_service.resend.Emails.send", mock_send),
    ):
        ok = email_service.send_email(
            to_email="customer@example.com",
            subject="Test Subject",
            text_body="Plain text",
            html_body="<p>HTML</p>",
        )
    assert ok is True
    mock_send.assert_called_once()
    params = mock_send.call_args[0][0]
    assert params["to"] == ["customer@example.com"]
    assert params["subject"] == "Test Subject"
    assert params["from"] == "Velora Enterprise <onboarding@resend.dev>"
    assert params["html"] == "<p>HTML</p>"
    assert params["text"] == "Plain text"


def test_send_email_returns_false_on_resend_error():
    with (
        patch.object(settings, "resend_api_key", "re_test_key"),
        patch(
            "app.services.email_service.resend.Emails.send",
            side_effect=RuntimeError("network error"),
        ),
    ):
        assert email_service.send_email(
            to_email="customer@example.com",
            subject="Test",
            text_body="Hello",
        ) is False
