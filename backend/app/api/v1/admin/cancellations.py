import math
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_admin
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.order import CancellationDecisionRequest, OrderResponse
from app.services import order_service

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=PaginatedResponse[OrderResponse])
async def list_cancellation_requests(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    pending_only: bool = Query(True),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[OrderResponse]:
    orders, total = await order_service.list_cancellation_requests(
        db, page=page, page_size=page_size, pending_only=pending_only
    )
    pages = math.ceil(total / page_size) if total else 0
    return PaginatedResponse(
        items=[order_service.build_order_response(o) for o in orders],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("/{order_id}/approve", response_model=OrderResponse)
async def approve_cancellation(
    order_id: uuid.UUID,
    body: CancellationDecisionRequest | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_user),
) -> OrderResponse:
    order = await order_service.fetch_order_by_id(db, order_id)
    if not order:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    updated = await order_service.approve_cancellation(
        db, order, admin.id, note=(body.note if body else None)
    )
    return order_service.build_order_response(updated)


@router.post("/{order_id}/reject", response_model=OrderResponse)
async def reject_cancellation(
    order_id: uuid.UUID,
    body: CancellationDecisionRequest | None = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_user),
) -> OrderResponse:
    order = await order_service.fetch_order_by_id(db, order_id)
    if not order:
        from fastapi import HTTPException, status

        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    updated = await order_service.reject_cancellation(
        db, order, admin.id, note=(body.note if body else None)
    )
    return order_service.build_order_response(updated)
