from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_admin
from app.schemas.payment import PaymentListResponse
from app.services import payment_service

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=PaymentListResponse)
async def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    payment_status: str | None = Query(None, alias="status"),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> PaymentListResponse:
    return await payment_service.list_payments(
        db, page=page, page_size=page_size, payment_status=payment_status, search=search
    )
