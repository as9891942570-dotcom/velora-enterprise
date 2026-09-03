"""Background helpers for post-order emails (must not fail the order)."""

from __future__ import annotations

import logging
import uuid

from app.core.database import AsyncSessionLocal
from app.services import email_service, order_service

logger = logging.getLogger(__name__)


async def send_order_placed_emails(order_id: uuid.UUID) -> None:
    try:
        async with AsyncSessionLocal() as db:
            order = await order_service.fetch_order_by_id(db, order_id)
            if not order:
                logger.warning("Order %s not found for email notifications", order_id)
                return
            email_service.send_admin_new_order_email(order)
            email_service.send_customer_order_confirmation_email(order)
    except Exception:
        logger.exception("Failed sending order emails for order_id=%s", order_id)
