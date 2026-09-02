"""Inventory helpers — stock decrement and restoration."""

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.product import Product


async def decrement_stock(db: AsyncSession, product_id, quantity: int) -> None:
    result = await db.execute(
        update(Product)
        .where(Product.id == product_id, Product.stock_quantity >= quantity)
        .values(stock_quantity=Product.stock_quantity - quantity)
        .returning(Product.id)
    )
    if result.scalar_one_or_none() is None:
        product_result = await db.execute(select(Product.name).where(Product.id == product_id))
        name = product_result.scalar_one_or_none() or "Product"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient stock for {name}",
        )


async def restore_stock(db: AsyncSession, product_id, quantity: int) -> None:
    await db.execute(
        update(Product)
        .where(Product.id == product_id)
        .values(stock_quantity=Product.stock_quantity + quantity)
    )
