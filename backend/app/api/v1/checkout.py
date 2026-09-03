from fastapi import APIRouter, BackgroundTasks, Depends, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_cart_session_id, get_current_user, get_db, require_customer
from app.core.config import settings
from app.models.user import User
from app.schemas.order import (
    CheckoutRequest,
    CheckoutValidationResponse,
    OrderCreateResponse,
    OrderResponse,
    PaymentVerifyRequest,
)
from app.services import cart_service, checkout_service
from app.services.order_email_tasks import send_order_placed_emails

router = APIRouter()

CART_SESSION_COOKIE = "cart_session"


def _set_cart_session_cookie(response: Response, session_id: str) -> None:
    max_age = settings.guest_cart_expiry_days * 86400
    response.set_cookie(
        key=CART_SESSION_COOKIE,
        value=session_id,
        httponly=True,
        secure=not settings.debug,
        samesite="lax",
        max_age=max_age,
        path="/",
    )


async def _resolve_cart(db: AsyncSession, request: Request, response: Response, user: User):
    if user:
        return await cart_service.get_or_create_cart(db, user_id=user.id)

    session_id = get_cart_session_id(request)
    cart = await cart_service.get_or_create_cart(db, session_id=session_id)
    if cart.session_id:
        _set_cart_session_cookie(response, cart.session_id)
    return cart


@router.post("/validate", response_model=CheckoutValidationResponse)
async def validate_checkout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_customer),
) -> CheckoutValidationResponse:
    cart = await _resolve_cart(db, request, response, user)
    return await checkout_service.validate_checkout(db, cart)


@router.post("/orders", response_model=OrderCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    body: CheckoutRequest,
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_customer),
) -> OrderCreateResponse:
    cart = await _resolve_cart(db, request, response, user)
    order_response = await checkout_service.create_order(db, cart, body, user)
    background_tasks.add_task(send_order_placed_emails, order_response.id)
    return order_response


@router.post("/verify-payment", response_model=OrderResponse)
async def verify_payment(
    body: PaymentVerifyRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(require_customer),
) -> OrderResponse:
    return await checkout_service.verify_payment(db, body, user)
