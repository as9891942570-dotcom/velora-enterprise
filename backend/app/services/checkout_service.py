from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.cart import Cart
from app.models.enums import OrderStatus, PaymentMethod, PaymentRecordStatus, PaymentStatus
from app.models.order import Order, OrderItem, OrderStatusHistory
from app.models.payment import Payment
from app.models.product import Product
from app.models.user import User
from app.schemas.order import (
    CheckoutRequest,
    CheckoutValidationResponse,
    OrderCreateResponse,
    PaymentVerifyRequest,
    RazorpayOrderInfo,
)
from app.services import address_service, cart_service, inventory_service
from app.services.order_service import build_order_response, fetch_order_by_id, generate_order_number
from app.services.shipping_service import calculate_shipping
from app.utils.razorpay_client import create_razorpay_order, is_razorpay_enabled, verify_signature


async def validate_checkout(db: AsyncSession, cart: Cart) -> CheckoutValidationResponse:
    loaded = await cart_service.get_cart_response(db, cart)
    errors: list[str] = []

    if not loaded.items:
        errors.append("Cart is empty")

    for item in loaded.items:
        if not item.in_stock:
            errors.append(f"{item.product_name} is out of stock or unavailable")

    shipping = calculate_shipping(loaded.subtotal)
    total = loaded.subtotal + shipping

    return CheckoutValidationResponse(
        valid=len(errors) == 0,
        subtotal=loaded.subtotal,
        shipping_amount=shipping,
        total_amount=total,
        item_count=loaded.item_count,
        errors=errors,
        online_payment_available=is_razorpay_enabled(),
    )


def _get_primary_image_url(product: Product) -> str | None:
    if product.images:
        return product.images[0].url
    return None


async def _resolve_shipping_address(db: AsyncSession, checkout: CheckoutRequest, user: User):
    if checkout.address_id:
        address = await address_service.get_address(db, user.id, checkout.address_id)
        return address_service.address_to_shipping_dict(address)

    if not checkout.shipping_address:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Shipping address required")

    return checkout.shipping_address.model_dump()


async def create_order(
    db: AsyncSession,
    cart: Cart,
    checkout: CheckoutRequest,
    user: User,
) -> OrderCreateResponse:
    validation = await validate_checkout(db, cart)
    if not validation.valid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=validation.errors)

    if checkout.payment_method != PaymentMethod.COD and not is_razorpay_enabled():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Online payment is currently unavailable",
        )

    shipping_address = await _resolve_shipping_address(db, checkout, user)

    loaded_cart = await cart_service.get_cart_response(db, cart)
    subtotal = loaded_cart.subtotal
    shipping = calculate_shipping(subtotal)
    total = subtotal + shipping

    product_ids = [item.product_id for item in loaded_cart.items]
    products_result = await db.execute(
        select(Product)
        .options(selectinload(Product.images))
        .where(Product.id.in_(product_ids))
        .with_for_update()
    )
    products = {p.id: p for p in products_result.scalars().all()}

    for item in loaded_cart.items:
        product = products.get(item.product_id)
        if not product or not product.is_active or product.stock_quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {item.product_name}",
            )

    order_number = await generate_order_number(db)

    order_status = OrderStatus.PENDING
    if checkout.payment_method == PaymentMethod.COD:
        payment_status = PaymentStatus.PENDING
    else:
        payment_status = PaymentStatus.PENDING

    order = Order(
        order_number=order_number,
        user_id=user.id,
        status=order_status,
        payment_status=payment_status,
        payment_method=checkout.payment_method,
        subtotal=subtotal,
        shipping_amount=shipping,
        discount_amount=Decimal("0"),
        total_amount=total,
        customer_name=checkout.customer_name,
        customer_email=checkout.customer_email,
        customer_phone=checkout.customer_phone,
        shipping_address=shipping_address,
        notes=checkout.notes,
    )
    db.add(order)
    await db.flush()

    for item in loaded_cart.items:
        product = products[item.product_id]
        line_total = product.price * item.quantity
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                product_slug=product.slug,
                unit_price=product.price,
                compare_at_price=product.compare_at_price,
                quantity=item.quantity,
                line_total=line_total,
                image_url=_get_primary_image_url(product),
            )
        )
        await inventory_service.decrement_stock(db, product.id, item.quantity)

    db.add(
        OrderStatusHistory(
            order_id=order.id,
            status=OrderStatus.PENDING,
            note="Order placed",
            created_by=user.id,
        )
    )

    for item in list(cart.items):
        await db.delete(item)

    razorpay_info: RazorpayOrderInfo | None = None

    if checkout.payment_method != PaymentMethod.COD:
        payment = Payment(
            order_id=order.id,
            amount=total,
            currency="INR",
            status=PaymentRecordStatus.CREATED,
        )
        db.add(payment)
        await db.flush()

        rz_order = create_razorpay_order(total, order_number)
        payment.razorpay_order_id = rz_order["id"]
        razorpay_info = RazorpayOrderInfo(
            razorpay_order_id=rz_order["id"],
            amount=rz_order["amount"],
            currency=rz_order["currency"],
            key_id=settings.razorpay_key_id,
        )

    await db.flush()

    loaded_order = await fetch_order_by_id(db, order.id)
    if not loaded_order:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Order creation failed")

    response = build_order_response(loaded_order)
    return OrderCreateResponse(
        **response.model_dump(),
        razorpay=razorpay_info,
        online_payment_available=is_razorpay_enabled(),
        message=None if is_razorpay_enabled() else "Online payment is currently unavailable",
    )


async def verify_payment(db: AsyncSession, payload: PaymentVerifyRequest, user: User) -> OrderCreateResponse:
    if not is_razorpay_enabled():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Online payment unavailable")

    if not verify_signature(payload.razorpay_order_id, payload.razorpay_payment_id, payload.razorpay_signature):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid payment signature")

    payment_result = await db.execute(
        select(Payment).where(Payment.razorpay_order_id == payload.razorpay_order_id)
    )
    payment = payment_result.scalar_one_or_none()
    if not payment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment record not found")

    if payment.razorpay_payment_id == payload.razorpay_payment_id and payment.status == PaymentRecordStatus.CAPTURED:
        order = await fetch_order_by_id(db, payment.order_id)
        if not order or order.user_id != user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        return build_order_response(order)

    order_result = await db.execute(
        select(Order)
        .options(selectinload(Order.items), selectinload(Order.status_history), selectinload(Order.payment))
        .where(Order.id == payment.order_id, Order.user_id == user.id)
    )
    order = order_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    payment.razorpay_payment_id = payload.razorpay_payment_id
    payment.razorpay_signature = payload.razorpay_signature
    payment.status = PaymentRecordStatus.CAPTURED
    order.payment_status = PaymentStatus.PAID

    await db.flush()
    loaded_order = await fetch_order_by_id(db, order.id)
    if not loaded_order:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Order update failed")
    return build_order_response(loaded_order)
