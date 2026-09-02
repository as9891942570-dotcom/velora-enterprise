import math
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_admin
from app.models.enums import ContactMessageStatus
from app.schemas.common import PaginatedResponse
from app.schemas.contact import ContactMessageResponse, ContactMessageStatusUpdate
from app.services import contact_service

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=PaginatedResponse[ContactMessageResponse])
async def list_messages(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: ContactMessageStatus | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[ContactMessageResponse]:
    messages, total = await contact_service.list_messages(
        db, page=page, page_size=page_size, status_filter=status_filter
    )
    pages = math.ceil(total / page_size) if total else 0
    return PaginatedResponse(
        items=[ContactMessageResponse.model_validate(m) for m in messages],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{message_id}", response_model=ContactMessageResponse)
async def get_message(
    message_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ContactMessageResponse:
    message = await contact_service.get_message(db, message_id)
    if message.status == ContactMessageStatus.UNREAD.value:
        message = await contact_service.update_status(db, message_id, ContactMessageStatus.READ)
    return ContactMessageResponse.model_validate(message)


@router.patch("/{message_id}/status", response_model=ContactMessageResponse)
async def update_message_status(
    message_id: uuid.UUID,
    body: ContactMessageStatusUpdate,
    db: AsyncSession = Depends(get_db),
) -> ContactMessageResponse:
    message = await contact_service.update_status(db, message_id, body.status)
    return ContactMessageResponse.model_validate(message)
