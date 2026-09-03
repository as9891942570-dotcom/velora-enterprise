import secrets
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import CancellationDecision, CancelledByRole, OrderStatus, PaymentMethod, PaymentStatus
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.schemas.order import OrderItemResponse, OrderPaymentInfo, OrderResponse, OrderStatusHistoryResponse
from app.services import inventory_service

CUSTOMER_CANCELLABLE = {OrderStatus.PENDING, OrderStatus.CONFIRMED}

ADMIN_CANCELLABLE = {OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.CANCELLATION_REQUESTED}

_CANCELLATION_BLOCKED_MESSAGES: dict[OrderStatus, str] = {
    OrderStatus.PROCESSING: "This order can no longer be cancelled because it is already being processed.",
    OrderStatus.SHIPPED: "This order can no longer be cancelled because it has already been shipped.",
    OrderStatus.OUT_FOR_DELIVERY: "This order can no longer be cancelled because it is out for delivery.",
    OrderStatus.DELIVERED: "This order can no longer be cancelled because it has already been delivered.",
    OrderStatus.CANCELLATION_REQUESTED: "A cancellation request is already pending admin review.",
    OrderStatus.CANCELLED: "This order is already cancelled.",
    OrderStatus.RETURNED: "This order cannot be cancelled because it has been returned.",
}

ORDER_EAGER_LOAD = (
    selectinload(Order.items),
    selectinload(Order.status_history),
    selectinload(Order.payment),
)

ADMIN_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.PROCESSING, OrderStatus.CANCELLED},
    OrderStatus.PROCESSING: {OrderStatus.SHIPPED},
    OrderStatus.SHIPPED: {OrderStatus.OUT_FOR_DELIVERY},
    OrderStatus.OUT_FOR_DELIVERY: {OrderStatus.DELIVERED},
    OrderStatus.DELIVERED: {OrderStatus.RETURNED},
    OrderStatus.CANCELLATION_REQUESTED: {OrderStatus.CANCELLED},
    OrderStatus.CANCELLED: set(),
    OrderStatus.RETURNED: set(),
}


def _build_payment_info(order: Order) -> OrderPaymentInfo | None:
    payment = getattr(order, "payment", None)
    if not payment:
        return None
    return OrderPaymentInfo(
        razorpay_order_id=payment.razorpay_order_id,
        razorpay_payment_id=payment.razorpay_payment_id,
        payment_record_status=payment.status,
    )


async def generate_order_number(db: AsyncSession) -> str:
    today = datetime.now(timezone.utc).strftime("%Y%m%d")
    prefix = f"VEL-{today}-"
    result = await db.execute(select(func.count(Order.id)).where(Order.order_number.like(f"{prefix}%")))
    count = result.scalar_one() + 1
    suffix = f"{count:04d}{secrets.token_hex(2).upper()}"
    return f"{prefix}{suffix}"


async def fetch_order_by_id(db: AsyncSession, order_id: uuid.UUID) -> Order | None:
    """Load an order with all relationships required by build_order_response."""
    result = await db.execute(
        select(Order).options(*ORDER_EAGER_LOAD).where(Order.id == order_id)
    )
    return result.scalar_one_or_none()


def build_order_response(order: Order) -> OrderResponse:
    items = [
        OrderItemResponse(
            id=item.id,
            product_id=item.product_id,
            product_name=item.product_name,
            product_slug=item.product_slug,
            unit_price=item.unit_price,
            compare_at_price=item.compare_at_price,
            quantity=item.quantity,
            line_total=item.line_total,
            image_url=item.image_url,
        )
        for item in order.items
    ]
    history = [
        OrderStatusHistoryResponse(
            status=entry.status,
            note=entry.note,
            created_at=entry.created_at,
        )
        for entry in sorted(getattr(order, "status_history", []), key=lambda h: h.created_at)
    ]
    return OrderResponse(
        id=order.id,
        order_number=order.order_number,
        status=order.status,
        payment_status=order.payment_status,
        payment_method=order.payment_method,
        subtotal=order.subtotal,
        shipping_amount=order.shipping_amount,
        discount_amount=order.discount_amount,
        total_amount=order.total_amount,
        customer_name=order.customer_name,
        customer_email=order.customer_email,
        customer_phone=order.customer_phone,
        shipping_address=order.shipping_address,
        notes=order.notes,
        shipping_partner=order.shipping_partner,
        tracking_number=order.tracking_number,
        confirmed_at=order.confirmed_at,
        processing_at=order.processing_at,
        shipped_at=order.shipped_at,
        out_for_delivery_at=order.out_for_delivery_at,
        delivered_at=order.delivered_at,
        cancelled_at=order.cancelled_at,
        cancelled_by_user_id=order.cancelled_by_user_id,
        cancelled_by_role=order.cancelled_by_role,
        cancellation_reason=order.cancellation_reason,
        status_before_cancel=order.status_before_cancel,
        cancellation_requested_at=order.cancellation_requested_at,
        cancellation_reviewed_at=order.cancellation_reviewed_at,
        cancellation_admin_note=order.cancellation_admin_note,
        cancellation_decision=order.cancellation_decision,
        payment=_build_payment_info(order),
        items=items,
        status_history=history,
        created_at=order.created_at,
        updated_at=order.updated_at,
    )


async def get_user_orders(
    db: AsyncSession,
    user_id: uuid.UUID,
    *,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[Order], int]:
    count_result = await db.execute(select(func.count(Order.id)).where(Order.user_id == user_id))
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Order)
        .options(*ORDER_EAGER_LOAD)
        .where(Order.user_id == user_id)
        .order_by(Order.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    orders = list(result.scalars().all())
    return orders, total


async def get_order_by_number(
    db: AsyncSession,
    order_number: str,
    *,
    user_id: uuid.UUID | None = None,
    guest_email: str | None = None,
) -> Order:
    result = await db.execute(
        select(Order)
        .options(*ORDER_EAGER_LOAD)
        .where(Order.order_number == order_number)
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if user_id:
        if order.user_id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    elif guest_email:
        if order.customer_email.lower() != guest_email.lower():
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    else:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")

    return order


async def update_status(
    db: AsyncSession,
    order: Order,
    new_status: OrderStatus,
    *,
    note: str | None = None,
    cancellation_reason: str | None = None,
    cancelled_by_role: CancelledByRole | None = None,
    updated_by: uuid.UUID | None = None,
    is_admin: bool = False,
    shipping_partner: str | None = None,
    tracking_number: str | None = None,
) -> Order:
    if order.status == new_status:
        refetched = await fetch_order_by_id(db, order.id)
        return refetched if refetched is not None else order

    if new_status == OrderStatus.CANCELLED:
        reason = (cancellation_reason or note or "").strip()
        if not reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cancellation reason is required",
            )
        if is_admin:
            if order.status not in ADMIN_CANCELLABLE:
                detail = _CANCELLATION_BLOCKED_MESSAGES.get(
                    order.status,
                    f"Cannot cancel order in {order.status.value} status",
                )
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
        elif order.status not in CUSTOMER_CANCELLABLE:
            detail = _CANCELLATION_BLOCKED_MESSAGES.get(
                order.status,
                f"Order in {order.status.value} status cannot be cancelled",
            )
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    if is_admin:
        allowed = ADMIN_TRANSITIONS.get(order.status, set())
        if new_status not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition from {order.status.value} to {new_status.value}",
            )
    elif new_status != OrderStatus.CANCELLED or order.status not in CUSTOMER_CANCELLABLE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid status update")

    if new_status == OrderStatus.CANCELLED and order.status != OrderStatus.CANCELLED:
        await _restore_order_stock(db, order)

    now = datetime.now(timezone.utc)
    if new_status == OrderStatus.CONFIRMED:
        order.confirmed_at = now
    elif new_status == OrderStatus.PROCESSING:
        order.processing_at = now
    elif new_status == OrderStatus.SHIPPED:
        order.shipped_at = now
        if shipping_partner:
            order.shipping_partner = shipping_partner.strip()
        if tracking_number:
            order.tracking_number = tracking_number.strip()
    elif new_status == OrderStatus.OUT_FOR_DELIVERY:
        order.out_for_delivery_at = now
    elif new_status == OrderStatus.DELIVERED:
        order.delivered_at = now
        # COD: delivery implies payment collected
        if (
            order.payment_method == PaymentMethod.COD
            and order.payment_status in {PaymentStatus.PENDING, PaymentStatus.COD_PENDING}
        ):
            order.payment_status = PaymentStatus.PAID
    elif new_status == OrderStatus.CANCELLED:
        order.cancelled_at = now
        if order.status == OrderStatus.CANCELLATION_REQUESTED:
            order.cancellation_decision = CancellationDecision.APPROVED
            order.cancellation_reviewed_at = now
            order.cancellation_reviewed_by_user_id = updated_by
        else:
            order.status_before_cancel = order.status
            order.cancelled_by_user_id = updated_by
            order.cancelled_by_role = cancelled_by_role
        if cancellation_reason or note:
            order.cancellation_reason = (cancellation_reason or note or "").strip()
        if cancelled_by_role and order.status == OrderStatus.CANCELLATION_REQUESTED:
            order.cancelled_by_role = cancelled_by_role

    order.status = new_status
    history_note = note
    if new_status == OrderStatus.CANCELLED:
        history_note = order.cancellation_reason
    db.add(
        OrderStatusHistory(
            order_id=order.id,
            status=new_status,
            note=history_note,
            created_by=updated_by,
        )
    )
    await db.flush()

    refetched = await fetch_order_by_id(db, order.id)
    if refetched is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return refetched


async def request_cancellation(
    db: AsyncSession,
    order: Order,
    user_id: uuid.UUID,
    reason: str,
) -> Order:
    if order.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    reason = (reason or "").strip()
    if not reason:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cancellation reason is required")
    if order.status not in CUSTOMER_CANCELLABLE:
        detail = _CANCELLATION_BLOCKED_MESSAGES.get(
            order.status,
            f"Order in {order.status.value} status cannot be cancelled",
        )
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    now = datetime.now(timezone.utc)
    previous = order.status
    order.status_before_cancel = previous
    order.status = OrderStatus.CANCELLATION_REQUESTED
    order.cancellation_reason = reason
    order.cancellation_requested_at = now
    order.cancellation_decision = CancellationDecision.PENDING
    order.cancelled_by_user_id = user_id
    order.cancelled_by_role = CancelledByRole.CUSTOMER
    db.add(
        OrderStatusHistory(
            order_id=order.id,
            status=OrderStatus.CANCELLATION_REQUESTED,
            note=reason,
            created_by=user_id,
        )
    )
    await db.flush()
    refetched = await fetch_order_by_id(db, order.id)
    if refetched is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return refetched


async def cancel_order_by_customer(
    db: AsyncSession,
    order: Order,
    user_id: uuid.UUID,
    reason: str,
) -> Order:
    """Customers request cancellation; they cannot cancel directly."""
    return await request_cancellation(db, order, user_id, reason)


async def approve_cancellation(
    db: AsyncSession,
    order: Order,
    admin_id: uuid.UUID,
    note: str | None = None,
) -> Order:
    if order.status != OrderStatus.CANCELLATION_REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This order does not have a pending cancellation request",
        )
    if note:
        order.cancellation_admin_note = note.strip()
    return await update_status(
        db,
        order,
        OrderStatus.CANCELLED,
        note=note,
        cancellation_reason=order.cancellation_reason,
        cancelled_by_role=CancelledByRole.CUSTOMER,
        updated_by=admin_id,
        is_admin=True,
    )


async def reject_cancellation(
    db: AsyncSession,
    order: Order,
    admin_id: uuid.UUID,
    note: str | None = None,
) -> Order:
    if order.status != OrderStatus.CANCELLATION_REQUESTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This order does not have a pending cancellation request",
        )
    restore_to = order.status_before_cancel or OrderStatus.PENDING
    if restore_to in {OrderStatus.CANCELLATION_REQUESTED, OrderStatus.CANCELLED}:
        restore_to = OrderStatus.PENDING

    now = datetime.now(timezone.utc)
    order.status = restore_to
    order.cancellation_decision = CancellationDecision.REJECTED
    order.cancellation_reviewed_at = now
    order.cancellation_reviewed_by_user_id = admin_id
    order.cancellation_admin_note = (note or "").strip() or None
    db.add(
        OrderStatusHistory(
            order_id=order.id,
            status=restore_to,
            note=note or "Cancellation request rejected",
            created_by=admin_id,
        )
    )
    await db.flush()
    refetched = await fetch_order_by_id(db, order.id)
    if refetched is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return refetched


async def mark_order_seen(db: AsyncSession, order: Order) -> Order:
    if order.admin_seen_at is None:
        order.admin_seen_at = datetime.now(timezone.utc)
        await db.flush()
    refetched = await fetch_order_by_id(db, order.id)
    return refetched if refetched is not None else order


async def list_cancellation_requests(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    pending_only: bool = True,
) -> tuple[list[Order], int]:
    query = select(Order)
    count_query = select(func.count(Order.id))
    if pending_only:
        query = query.where(Order.status == OrderStatus.CANCELLATION_REQUESTED)
        count_query = count_query.where(Order.status == OrderStatus.CANCELLATION_REQUESTED)
    else:
        query = query.where(Order.cancellation_requested_at.is_not(None))
        count_query = count_query.where(Order.cancellation_requested_at.is_not(None))

    total = (await db.execute(count_query)).scalar_one()
    offset = (page - 1) * page_size
    result = await db.execute(
        query.options(*ORDER_EAGER_LOAD)
        .order_by(Order.cancellation_requested_at.desc().nullslast(), Order.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return list(result.scalars().all()), total


async def _restore_order_stock(db: AsyncSession, order: Order) -> None:
    if order.stock_restored:
        return
    for item in order.items:
        if item.product_id and item.quantity > 0:
            await inventory_service.restore_stock(db, item.product_id, item.quantity)
    order.stock_restored = True
