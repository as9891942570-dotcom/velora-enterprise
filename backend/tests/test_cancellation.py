"""Tests for order cancellation with required reason."""

import pytest
from pydantic import ValidationError

from app.models.enums import OrderStatus
from app.schemas.order import OrderCancelRequest, OrderStatusUpdate


def test_cancel_request_requires_reason():
    with pytest.raises(ValidationError):
        OrderCancelRequest(reason="")


def test_status_update_requires_reason_when_cancelled():
    with pytest.raises(ValidationError):
        OrderStatusUpdate(status=OrderStatus.CANCELLED)


def test_status_update_accepts_cancellation_reason():
    body = OrderStatusUpdate(
        status=OrderStatus.CANCELLED,
        cancellation_reason="Product out of stock",
    )
    assert body.cancellation_reason == "Product out of stock"
