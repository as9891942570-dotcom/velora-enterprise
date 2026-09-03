import math
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db, require_admin
from app.models.enums import CancelledByRole, OrderStatus
from app.models.order import Order
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.order import OrderResponse, OrderStatusUpdate
from app.services import order_service

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=PaginatedResponse[OrderResponse])
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[OrderResponse]:
    query = select(Order)
    count_query = select(func.count(Order.id))

    if status_filter:
        from app.models.enums import OrderStatus

        try:
            order_status = OrderStatus(status_filter)
            query = query.where(Order.status == order_status)
            count_query = count_query.where(Order.status == order_status)
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter")

    total = (await db.execute(count_query)).scalar_one()
    offset = (page - 1) * page_size
    result = await db.execute(
        query.options(*order_service.ORDER_EAGER_LOAD)
        .order_by(Order.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    orders = result.scalars().all()
    pages = math.ceil(total / page_size) if total else 0
    return PaginatedResponse(
        items=[order_service.build_order_response(o) for o in orders],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> OrderResponse:
    order = await order_service.fetch_order_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    order = await order_service.mark_order_seen(db, order)
    return order_service.build_order_response(order)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: uuid.UUID,
    body: OrderStatusUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_user),
) -> OrderResponse:
    order = await order_service.fetch_order_by_id(db, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    updated = await order_service.update_status(
        db,
        order,
        body.status,
        note=body.note,
        cancellation_reason=body.cancellation_reason,
        cancelled_by_role=CancelledByRole.ADMIN if body.status == OrderStatus.CANCELLED else None,
        updated_by=admin.id,
        is_admin=True,
        shipping_partner=body.shipping_partner,
        tracking_number=body.tracking_number,
    )
    return order_service.build_order_response(updated)
