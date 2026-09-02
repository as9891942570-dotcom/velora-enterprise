"""Order workflow unit tests for status transitions."""

from app.models.enums import OrderStatus
from app.services.order_service import ADMIN_TRANSITIONS


def test_pending_order_can_be_confirmed_by_admin():
    assert OrderStatus.CONFIRMED in ADMIN_TRANSITIONS[OrderStatus.PENDING]


def test_pending_order_can_be_cancelled_by_admin():
    assert OrderStatus.CANCELLED in ADMIN_TRANSITIONS[OrderStatus.PENDING]


def test_confirmed_order_cannot_revert_to_pending():
    assert OrderStatus.PENDING not in ADMIN_TRANSITIONS.get(OrderStatus.CONFIRMED, set())


def test_pending_cannot_skip_to_shipped():
    assert OrderStatus.SHIPPED not in ADMIN_TRANSITIONS[OrderStatus.PENDING]


def test_pending_cannot_skip_to_processing():
    assert OrderStatus.PROCESSING not in ADMIN_TRANSITIONS[OrderStatus.PENDING]


def test_confirmed_cannot_skip_to_shipped():
    assert OrderStatus.SHIPPED not in ADMIN_TRANSITIONS[OrderStatus.CONFIRMED]


def test_processing_cannot_skip_to_delivered():
    assert OrderStatus.DELIVERED not in ADMIN_TRANSITIONS[OrderStatus.PROCESSING]


def test_full_forward_workflow_chain():
    assert OrderStatus.CONFIRMED in ADMIN_TRANSITIONS[OrderStatus.PENDING]
    assert OrderStatus.PROCESSING in ADMIN_TRANSITIONS[OrderStatus.CONFIRMED]
    assert OrderStatus.SHIPPED in ADMIN_TRANSITIONS[OrderStatus.PROCESSING]
    assert OrderStatus.OUT_FOR_DELIVERY in ADMIN_TRANSITIONS[OrderStatus.SHIPPED]
    assert OrderStatus.DELIVERED in ADMIN_TRANSITIONS[OrderStatus.OUT_FOR_DELIVERY]


def test_processing_cannot_be_cancelled_by_admin():
    assert OrderStatus.CANCELLED not in ADMIN_TRANSITIONS[OrderStatus.PROCESSING]
