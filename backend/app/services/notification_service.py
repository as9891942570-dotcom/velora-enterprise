from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact_message import ContactMessage
from app.models.enums import ContactMessageStatus, OrderStatus
from app.models.order import Order
from app.models.review import ProductReview
from app.schemas.notifications import NotificationCounts


async def get_notification_counts(db: AsyncSession) -> NotificationCounts:
    new_orders = (
        await db.execute(
            select(func.count(Order.id)).where(
                Order.status == OrderStatus.PENDING,
                Order.admin_seen_at.is_(None),
            )
        )
    ).scalar_one()
    unread_reviews = (
        await db.execute(select(func.count(ProductReview.id)).where(ProductReview.is_read.is_(False)))
    ).scalar_one()
    pending_cancellations = (
        await db.execute(
            select(func.count(Order.id)).where(Order.status == OrderStatus.CANCELLATION_REQUESTED)
        )
    ).scalar_one()
    unread_messages = (
        await db.execute(
            select(func.count(ContactMessage.id)).where(ContactMessage.status == ContactMessageStatus.UNREAD.value)
        )
    ).scalar_one()
    return NotificationCounts(
        new_orders=new_orders,
        unread_reviews=unread_reviews,
        pending_cancellations=pending_cancellations,
        unread_messages=unread_messages,
    )
