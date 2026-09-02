from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.category import Category
from app.models.enums import OrderStatus, UserRole
from app.models.order import Order
from app.models.product import Product
from app.models.user import User
from app.schemas.dashboard import DashboardStatsResponse, InventorySummary, LowStockProduct
from app.services.order_service import build_order_response

VALID_REVENUE_STATUSES = [OrderStatus.CANCELLED, OrderStatus.RETURNED]
PENDING_STATUSES = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PROCESSING]


def _month_start(now: datetime) -> datetime:
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _day_start(now: datetime) -> datetime:
    return now.replace(hour=0, minute=0, second=0, microsecond=0)


async def _sum_revenue(db: AsyncSession, *, since: datetime | None = None) -> float:
    query = select(func.coalesce(func.sum(Order.total_amount), 0)).where(
        Order.status.not_in(VALID_REVENUE_STATUSES)
    )
    if since:
        query = query.where(Order.created_at >= since)
    result = await db.execute(query)
    return float(result.scalar_one())


async def _count_orders(db: AsyncSession, *, since: datetime | None = None) -> int:
    query = select(func.count(Order.id))
    if since:
        query = query.where(Order.created_at >= since)
    result = await db.execute(query)
    return result.scalar_one()


async def get_dashboard_stats(db: AsyncSession) -> DashboardStatsResponse:
    now = datetime.now(timezone.utc)
    month_start = _month_start(now)
    day_start = _day_start(now)
    threshold = settings.low_stock_threshold

    total_products = (await db.execute(select(func.count(Product.id)))).scalar_one()
    total_categories = (await db.execute(select(func.count(Category.id)))).scalar_one()
    total_orders = (await db.execute(select(func.count(Order.id)))).scalar_one()
    total_customers = (
        await db.execute(select(func.count(User.id)).where(User.role == UserRole.CUSTOMER))
    ).scalar_one()
    pending_orders = (
        await db.execute(select(func.count(Order.id)).where(Order.status.in_(PENDING_STATUSES)))
    ).scalar_one()

    total_revenue = await _sum_revenue(db)
    revenue_today = await _sum_revenue(db, since=day_start)
    revenue_this_month = await _sum_revenue(db, since=month_start)
    orders_today = await _count_orders(db, since=day_start)
    orders_this_month = await _count_orders(db, since=month_start)

    in_stock_count = (
        await db.execute(
            select(func.count(Product.id)).where(
                Product.is_active.is_(True), Product.stock_quantity > threshold
            )
        )
    ).scalar_one()
    low_stock_count = (
        await db.execute(
            select(func.count(Product.id)).where(
                Product.is_active.is_(True),
                Product.stock_quantity > 0,
                Product.stock_quantity <= threshold,
            )
        )
    ).scalar_one()
    out_of_stock_count = (
        await db.execute(
            select(func.count(Product.id)).where(
                Product.is_active.is_(True), Product.stock_quantity <= 0
            )
        )
    ).scalar_one()

    seven_days_ago = now - timedelta(days=7)
    recent_result = await db.execute(
        select(Order)
        .options(
            selectinload(Order.items),
            selectinload(Order.status_history),
            selectinload(Order.payment),
        )
        .where(Order.created_at >= seven_days_ago)
        .order_by(Order.created_at.desc())
        .limit(10)
    )
    recent_orders = [build_order_response(o) for o in recent_result.scalars().all()]

    low_stock_result = await db.execute(
        select(Product)
        .options(selectinload(Product.category))
        .where(Product.is_active.is_(True), Product.stock_quantity <= threshold)
        .order_by(Product.stock_quantity)
        .limit(20)
    )
    low_stock_products = [
        LowStockProduct(
            id=str(p.id),
            name=p.name,
            slug=p.slug,
            stock_quantity=p.stock_quantity,
            price=str(p.price),
            category_name=p.category.name if p.category else None,
            is_out_of_stock=p.stock_quantity <= 0,
        )
        for p in low_stock_result.scalars().all()
    ]

    return DashboardStatsResponse(
        total_revenue=f"{total_revenue:.2f}",
        total_orders=total_orders,
        total_customers=total_customers,
        total_products=total_products,
        total_categories=total_categories,
        pending_orders=pending_orders,
        revenue_today=f"{revenue_today:.2f}",
        revenue_this_month=f"{revenue_this_month:.2f}",
        orders_today=orders_today,
        orders_this_month=orders_this_month,
        inventory=InventorySummary(
            total_products=total_products,
            in_stock_count=in_stock_count,
            low_stock_count=low_stock_count,
            out_of_stock_count=out_of_stock_count,
        ),
        recent_orders=recent_orders,
        low_stock_products=low_stock_products,
    )
