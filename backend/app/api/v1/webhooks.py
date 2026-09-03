import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db
from app.models.enums import OrderStatus, PaymentRecordStatus, PaymentStatus
from app.models.order import Order, OrderStatusHistory
from app.models.payment import Payment
from app.services import inventory_service
from app.utils.razorpay_client import verify_webhook_signature

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/razorpay")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)) -> dict[str, str]:
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not verify_webhook_signature(body, signature):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")

    import json

    payload = json.loads(body)
    event = payload.get("event", "")
    payment_entity = payload.get("payload", {}).get("payment", {}).get("entity", {})
    razorpay_order_id = payment_entity.get("order_id")
    razorpay_payment_id = payment_entity.get("id")

    if not razorpay_order_id:
        return {"status": "ignored"}

    result = await db.execute(select(Payment).where(Payment.razorpay_order_id == razorpay_order_id))
    payment = result.scalar_one_or_none()
    if not payment:
        logger.warning("Payment not found for razorpay order %s", razorpay_order_id)
        return {"status": "ignored"}

    if event == "payment.captured":
        if payment.status == PaymentRecordStatus.CAPTURED and payment.razorpay_payment_id == razorpay_payment_id:
            return {"status": "already_processed"}

    order_result = await db.execute(
        select(Order).options(selectinload(Order.items)).where(Order.id == payment.order_id)
    )
    order = order_result.scalar_one_or_none()
    if not order:
        return {"status": "ignored"}

    payment.raw_webhook_payload = payload

    if event == "payment.captured":
        payment.status = PaymentRecordStatus.CAPTURED
        payment.razorpay_payment_id = razorpay_payment_id
        order.payment_status = PaymentStatus.PAID
    elif event == "payment.failed":
        if payment.status == PaymentRecordStatus.FAILED:
            return {"status": "already_processed"}

        payment.status = PaymentRecordStatus.FAILED
        order.payment_status = PaymentStatus.FAILED
        if order.status == OrderStatus.PENDING:
            if not order.stock_restored:
                for item in order.items:
                    if item.product_id and item.quantity > 0:
                        await inventory_service.restore_stock(db, item.product_id, item.quantity)
                order.stock_restored = True
            order.status = OrderStatus.CANCELLED
            db.add(
                OrderStatusHistory(
                    order_id=order.id,
                    status=OrderStatus.CANCELLED,
                    note="Payment failed — order cancelled",
                )
            )

    await db.flush()
    return {"status": "ok"}
