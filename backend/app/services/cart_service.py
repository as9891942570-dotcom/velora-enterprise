import uuid

from datetime import datetime, timedelta, timezone

from decimal import Decimal



from fastapi import HTTPException, status

from sqlalchemy import select

from sqlalchemy.ext.asyncio import AsyncSession

from sqlalchemy.orm import selectinload



from app.core.config import settings

from app.models.cart import Cart, CartItem

from app.models.product import Product

from app.schemas.cart import CartItemResponse, CartResponse, CartSyncRequest

from app.services.shipping_service import calculate_shipping





def _get_primary_image_url(product: Product) -> str | None:

    if product.images:

        return product.images[0].url

    return None





def _build_cart_item_response(item: CartItem) -> CartItemResponse:

    product = item.product

    unit_price = product.price

    line_total = unit_price * item.quantity

    stock = product.stock_quantity

    return CartItemResponse(

        id=item.id,

        product_id=product.id,

        product_name=product.name,

        product_slug=product.slug,

        unit_price=unit_price,

        quantity=item.quantity,

        line_total=line_total,

        image_url=_get_primary_image_url(product),

        stock_quantity=stock,

        in_stock=stock >= item.quantity and product.is_active,

    )





def build_cart_response(cart: Cart) -> CartResponse:

    items = [_build_cart_item_response(item) for item in cart.items if item.product.is_active]

    subtotal = sum((item.line_total for item in items), Decimal("0"))

    item_count = sum(item.quantity for item in items)

    shipping = calculate_shipping(subtotal)

    return CartResponse(

        id=cart.id,

        items=items,

        item_count=item_count,

        subtotal=subtotal,

        shipping_amount=shipping,

        total_amount=subtotal + shipping,

    )





async def get_or_create_cart(

    db: AsyncSession,

    *,

    user_id: uuid.UUID | None = None,

    session_id: str | None = None,

) -> Cart:

    if user_id:

        result = await db.execute(

            select(Cart)

            .options(selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.images))

            .where(Cart.user_id == user_id)

        )

        cart = result.scalar_one_or_none()

        if cart:

            return cart

        cart = Cart(user_id=user_id)

        db.add(cart)

        await db.flush()

        await db.refresh(cart, ["items"])

        return cart



    if not session_id:

        session_id = str(uuid.uuid4())



    result = await db.execute(

        select(Cart)

        .options(selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.images))

        .where(Cart.session_id == session_id)

    )

    cart = result.scalar_one_or_none()

    if cart:

        return cart



    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.guest_cart_expiry_days)

    cart = Cart(session_id=session_id, expires_at=expires_at)

    db.add(cart)

    await db.flush()

    await db.refresh(cart, ["items"])

    return cart





async def _load_cart(db: AsyncSession, cart_id: uuid.UUID) -> Cart:

    result = await db.execute(

        select(Cart)

        .options(selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.images))

        .where(Cart.id == cart_id)

    )

    cart = result.scalar_one_or_none()

    if not cart:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart not found")

    return cart





async def add_item(db: AsyncSession, cart: Cart, product_id: uuid.UUID, quantity: int) -> Cart:

    if quantity <= 0:

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than 0")



    result = await db.execute(

        select(Product)

        .options(selectinload(Product.images))

        .where(Product.id == product_id, Product.is_active.is_(True))

    )

    product = result.scalar_one_or_none()

    if not product:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found or inactive")

    if product.stock_quantity < quantity:

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock")



    existing = next((item for item in cart.items if item.product_id == product_id), None)

    if existing:

        new_qty = existing.quantity + quantity

        if product.stock_quantity < new_qty:

            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock")

        existing.quantity = new_qty

    else:

        cart.items.append(CartItem(product_id=product_id, quantity=quantity))



    await db.flush()

    return await _load_cart(db, cart.id)





async def update_item(db: AsyncSession, cart: Cart, item_id: uuid.UUID, quantity: int) -> Cart:

    if quantity <= 0:

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Quantity must be greater than 0")



    item = next((i for i in cart.items if i.id == item_id), None)

    if not item:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")



    result = await db.execute(select(Product).where(Product.id == item.product_id, Product.is_active.is_(True)))

    product = result.scalar_one_or_none()

    if not product:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found or inactive")

    if product.stock_quantity < quantity:

        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock")



    item.quantity = quantity

    await db.flush()

    return await _load_cart(db, cart.id)





async def remove_item(db: AsyncSession, cart: Cart, item_id: uuid.UUID) -> Cart:

    item = next((i for i in cart.items if i.id == item_id), None)

    if not item:

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

    await db.delete(item)

    await db.flush()

    return await _load_cart(db, cart.id)





async def clear_cart(db: AsyncSession, cart: Cart) -> Cart:

    for item in list(cart.items):

        await db.delete(item)

    await db.flush()

    return await _load_cart(db, cart.id)





async def sync_items(db: AsyncSession, cart: Cart, payload: CartSyncRequest) -> Cart:

    """Merge localStorage guest items into server cart with stock validation."""

    for sync_item in payload.items:

        result = await db.execute(

            select(Product).where(Product.id == sync_item.product_id, Product.is_active.is_(True))

        )

        product = result.scalar_one_or_none()

        if not product:

            continue



        qty = min(sync_item.quantity, product.stock_quantity)

        if qty <= 0:

            continue



        existing = next((item for item in cart.items if item.product_id == sync_item.product_id), None)

        if existing:

            merged = min(existing.quantity + qty, product.stock_quantity)

            existing.quantity = merged

        else:

            cart.items.append(CartItem(product_id=sync_item.product_id, quantity=qty))



    await db.flush()

    return await _load_cart(db, cart.id)





async def merge_guest_cart(db: AsyncSession, user_id: uuid.UUID, session_id: str | None) -> None:

    if not session_id:

        return



    guest_result = await db.execute(

        select(Cart)

        .options(selectinload(Cart.items).selectinload(CartItem.product))

        .where(Cart.session_id == session_id)

    )

    guest_cart = guest_result.scalar_one_or_none()

    if not guest_cart or not guest_cart.items:

        return



    user_cart = await get_or_create_cart(db, user_id=user_id)



    for guest_item in list(guest_cart.items):

        product = guest_item.product

        if not product or not product.is_active:

            await db.delete(guest_item)

            continue



        existing = next((item for item in user_cart.items if item.product_id == guest_item.product_id), None)

        if existing:

            merged_qty = min(existing.quantity + guest_item.quantity, product.stock_quantity)

            if merged_qty <= 0:

                await db.delete(existing)

            else:

                existing.quantity = merged_qty

            await db.delete(guest_item)

        else:

            capped = min(guest_item.quantity, product.stock_quantity)

            if capped <= 0:

                await db.delete(guest_item)

            else:

                guest_item.quantity = capped

                guest_item.cart_id = user_cart.id



    guest_cart.session_id = None

    await db.flush()





async def get_cart_response(db: AsyncSession, cart: Cart) -> CartResponse:

    loaded = await _load_cart(db, cart.id)

    return build_cart_response(loaded)

