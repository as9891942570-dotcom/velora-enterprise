from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_admin
from app.schemas.notifications import NotificationCounts
from app.services import notification_service

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/counts", response_model=NotificationCounts)
async def notification_counts(db: AsyncSession = Depends(get_db)) -> NotificationCounts:
    return await notification_service.get_notification_counts(db)
