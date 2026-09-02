import hashlib
import hmac
import logging
from decimal import Decimal
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


class RazorpayNotConfiguredError(Exception):
    pass


def is_razorpay_enabled() -> bool:
    return settings.razorpay_enabled


def create_razorpay_order(amount: Decimal, order_number: str, receipt: str | None = None) -> dict[str, Any]:
    if not is_razorpay_enabled():
        raise RazorpayNotConfiguredError("Razorpay is not configured")

    import razorpay

    client = razorpay.Client(auth=(settings.razorpay_key_id, settings.razorpay_key_secret))
    amount_paise = int(amount * 100)
    payload = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt or order_number,
        "notes": {"order_number": order_number},
    }
    return client.order.create(data=payload)


def verify_signature(razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
    if not settings.razorpay_key_secret:
        logger.warning("Razorpay key secret not configured; cannot verify signature")
        return False

    message = f"{razorpay_order_id}|{razorpay_payment_id}".encode()
    generated = hmac.new(
        settings.razorpay_key_secret.encode(),
        message,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(generated, razorpay_signature)


def verify_webhook_signature(body: bytes, signature: str) -> bool:
    if not settings.razorpay_webhook_secret:
        logger.warning("Razorpay webhook secret not configured; cannot verify webhook")
        return False

    generated = hmac.new(
        settings.razorpay_webhook_secret.encode(),
        body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(generated, signature)
