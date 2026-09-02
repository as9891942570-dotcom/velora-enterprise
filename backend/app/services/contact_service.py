import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact_message import ContactMessage
from app.models.enums import ContactMessageStatus
from app.schemas.contact import ContactRequest


async def create_message(db: AsyncSession, data: ContactRequest) -> ContactMessage:
    message = ContactMessage(
        name=data.name,
        email=data.email,
        subject=data.subject,
        message=data.message,
        status=ContactMessageStatus.UNREAD.value,
    )
    db.add(message)
    await db.flush()
    return message


async def list_messages(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    status_filter: ContactMessageStatus | None = None,
) -> tuple[list[ContactMessage], int]:
    query = select(ContactMessage)
    count_query = select(func.count(ContactMessage.id))
    if status_filter:
        query = query.where(ContactMessage.status == status_filter.value)
        count_query = count_query.where(ContactMessage.status == status_filter.value)

    total = (await db.execute(count_query)).scalar_one()
    offset = (page - 1) * page_size
    result = await db.execute(
        query.order_by(ContactMessage.created_at.desc()).offset(offset).limit(page_size)
    )
    return list(result.scalars().all()), total


async def get_message(db: AsyncSession, message_id: uuid.UUID) -> ContactMessage:
    result = await db.execute(select(ContactMessage).where(ContactMessage.id == message_id))
    message = result.scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found")
    return message


async def update_status(
    db: AsyncSession, message_id: uuid.UUID, new_status: ContactMessageStatus
) -> ContactMessage:
    message = await get_message(db, message_id)
    message.status = new_status.value
    await db.flush()
    return message
