import math

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_current_user_optional, get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.order import OrderCancelRequest, OrderResponse
from app.services import order_service

router = APIRouter()


@router.get("", response_model=PaginatedResponse[OrderResponse])
async def list_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> PaginatedResponse[OrderResponse]:
    orders, total = await order_service.get_user_orders(db, user.id, page=page, page_size=page_size)
    pages = math.ceil(total / page_size) if total else 0
    return PaginatedResponse(
        items=[order_service.build_order_response(o) for o in orders],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{order_number}", response_model=OrderResponse)
async def get_order(
    order_number: str,
    email: str | None = Query(None, description="Guest email for order lookup"),
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> OrderResponse:
    order = await order_service.get_order_by_number(
        db,
        order_number,
        user_id=user.id if user else None,
        guest_email=email,
    )
    return order_service.build_order_response(order)


@router.post("/{order_number}/cancel-request", response_model=OrderResponse)
async def request_cancellation(
    order_number: str,
    body: OrderCancelRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> OrderResponse:
    order = await order_service.get_order_by_number(db, order_number, user_id=user.id)
    updated = await order_service.request_cancellation(db, order, user.id, body.reason)
    return order_service.build_order_response(updated)


@router.post("/{order_number}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_number: str,
    body: OrderCancelRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> OrderResponse:
    """Alias: customers request cancellation; they cannot cancel directly."""
    order = await order_service.get_order_by_number(db, order_number, user_id=user.id)
    updated = await order_service.request_cancellation(db, order, user.id, body.reason)
    return order_service.build_order_response(updated)
