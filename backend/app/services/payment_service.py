import math
from decimal import Decimal

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import PaymentStatus
from app.models.order import Order
from app.schemas.payment import PaymentListItem, PaymentListResponse, PaymentSummary


async def list_payments(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    payment_status: str | None = None,
    search: str | None = None,
) -> PaymentListResponse:
    query = select(Order)
    count_query = select(func.count(Order.id))

    if payment_status:
        normalized = payment_status.strip().lower()
        if normalized == "pending":
            pending_statuses = (PaymentStatus.PENDING, PaymentStatus.COD_PENDING)
            query = query.where(Order.payment_status.in_(pending_statuses))
            count_query = count_query.where(Order.payment_status.in_(pending_statuses))
        else:
            try:
                status = PaymentStatus(normalized)
            except ValueError:
                status = None
            if status:
                query = query.where(Order.payment_status == status)
                count_query = count_query.where(Order.payment_status == status)

    if search:
        term = f"%{search.strip()}%"
        filt = or_(
            Order.order_number.ilike(term),
            Order.customer_name.ilike(term),
            Order.customer_email.ilike(term),
        )
        query = query.where(filt)
        count_query = count_query.where(filt)

    total = (await db.execute(count_query)).scalar_one()
    result = await db.execute(
        query.options(selectinload(Order.payment))
        .order_by(Order.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    orders = list(result.scalars().all())

    paid = PaymentStatus.PAID
    pending = (PaymentStatus.PENDING, PaymentStatus.COD_PENDING)
    failed = PaymentStatus.FAILED
    refunded = PaymentStatus.REFUNDED

    total_revenue = (
        await db.execute(
            select(func.coalesce(func.sum(Order.total_amount), 0)).where(Order.payment_status == paid)
        )
    ).scalar_one()
    successful = (
        await db.execute(select(func.count(Order.id)).where(Order.payment_status == paid))
    ).scalar_one()
    pending_count = (
        await db.execute(select(func.count(Order.id)).where(Order.payment_status.in_(pending)))
    ).scalar_one()
    failed_count = (
        await db.execute(select(func.count(Order.id)).where(Order.payment_status == failed))
    ).scalar_one()
    refunded_amount = (
        await db.execute(
            select(func.coalesce(func.sum(Order.total_amount), 0)).where(Order.payment_status == refunded)
        )
    ).scalar_one()

    items = [
        PaymentListItem(
            order_id=order.id,
            order_number=order.order_number,
            customer_name=order.customer_name,
            customer_email=order.customer_email,
            total_amount=order.total_amount,
            payment_method=order.payment_method,
            payment_status=order.payment_status,
            order_status=order.status,
            transaction_id=order.payment.razorpay_payment_id if order.payment else None,
            razorpay_order_id=order.payment.razorpay_order_id if order.payment else None,
            payment_record_status=order.payment.status if order.payment else None,
            created_at=order.created_at,
        )
        for order in orders
    ]
    pages = math.ceil(total / page_size) if total else 0
    return PaymentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
        summary=PaymentSummary(
            total_revenue=Decimal(str(total_revenue)),
            successful_payments=successful,
            pending_payments=pending_count,
            failed_payments=failed_count,
            refunded_amount=Decimal(str(refunded_amount)),
        ),
    )
