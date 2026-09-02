from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.schemas.common import MessageResponse
from app.schemas.contact import ContactRequest
from app.services import contact_service

router = APIRouter()


@router.post("", response_model=MessageResponse)
async def submit_contact(
    body: ContactRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await contact_service.create_message(db, body)
    return MessageResponse(message="Thank you for contacting us. We will get back to you soon.")
