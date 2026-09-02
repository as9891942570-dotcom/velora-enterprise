import uuid

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_cart_session_id, get_current_user_optional, get_db, reject_admin_cart_user
from app.core.config import settings
from app.models.user import User
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartResponse, CartSyncRequest
from app.services import cart_service

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


async def _resolve_cart(
    db: AsyncSession,
    request: Request,
    response: Response,
    user: User | None,
) -> tuple:
    if user:
        cart = await cart_service.get_or_create_cart(db, user_id=user.id)
        return cart, None

    session_id = get_cart_session_id(request)
    cart = await cart_service.get_or_create_cart(db, session_id=session_id)
    if cart.session_id and cart.session_id != session_id:
        _set_cart_session_cookie(response, cart.session_id)
    elif cart.session_id:
        _set_cart_session_cookie(response, cart.session_id)
    return cart, cart.session_id


@router.get("", response_model=CartResponse)
async def get_cart(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> CartResponse:
    reject_admin_cart_user(user)
    cart, session_id = await _resolve_cart(db, request, response, user)
    if session_id and not user:
        _set_cart_session_cookie(response, session_id)
    return await cart_service.get_cart_response(db, cart)


@router.post("/items", response_model=CartResponse)
async def add_cart_item(
    body: CartItemCreate,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> CartResponse:
    reject_admin_cart_user(user)
    cart, session_id = await _resolve_cart(db, request, response, user)
    if session_id and not user:
        _set_cart_session_cookie(response, session_id)
    updated = await cart_service.add_item(db, cart, body.product_id, body.quantity)
    return await cart_service.get_cart_response(db, updated)


@router.patch("/items/{item_id}", response_model=CartResponse)
async def update_cart_item(
    item_id: uuid.UUID,
    body: CartItemUpdate,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> CartResponse:
    reject_admin_cart_user(user)
    cart, session_id = await _resolve_cart(db, request, response, user)
    if session_id and not user:
        _set_cart_session_cookie(response, session_id)
    updated = await cart_service.update_item(db, cart, item_id, body.quantity)
    return await cart_service.get_cart_response(db, updated)


@router.delete("/items/{item_id}", response_model=CartResponse)
async def remove_cart_item(
    item_id: uuid.UUID,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> CartResponse:
    reject_admin_cart_user(user)
    cart, session_id = await _resolve_cart(db, request, response, user)
    if session_id and not user:
        _set_cart_session_cookie(response, session_id)
    updated = await cart_service.remove_item(db, cart, item_id)
    return await cart_service.get_cart_response(db, updated)


@router.delete("", response_model=CartResponse)
async def clear_cart(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> CartResponse:
    reject_admin_cart_user(user)
    cart, session_id = await _resolve_cart(db, request, response, user)
    if session_id and not user:
        _set_cart_session_cookie(response, session_id)
    updated = await cart_service.clear_cart(db, cart)
    return await cart_service.get_cart_response(db, updated)


@router.post("/sync", response_model=CartResponse)
async def sync_cart(
    body: CartSyncRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_current_user_optional),
) -> CartResponse:
    reject_admin_cart_user(user)
    cart, session_id = await _resolve_cart(db, request, response, user)
    if session_id and not user:
        _set_cart_session_cookie(response, session_id)
    updated = await cart_service.sync_items(db, cart, body)
    return await cart_service.get_cart_response(db, updated)
