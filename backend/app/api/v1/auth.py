import uuid
from datetime import datetime, timezone

from fastapi import APIRouter,  Depends, HTTPException, Request, Response, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_cart_session_id, get_current_user, get_db
from app.core.security import (
    create_access_token,
    create_refresh_token_value,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.enums import UserRole
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import (
    ForgotPasswordRequest,
    GoogleLoginRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserResponse,
)
from app.schemas.common import MessageResponse
from app.services import cart_service, password_reset_service
from app.utils.auth_cookies import (
    ADMIN_REFRESH_COOKIE_NAME,
    REFRESH_COOKIE_NAME,
    clear_admin_refresh_cookie,
    clear_refresh_cookie,
    refresh_token_expiry,
    set_admin_refresh_cookie,
    set_refresh_cookie,
)

router = APIRouter()


async def _create_refresh_token(db: AsyncSession, user_id: uuid.UUID) -> str:
    token = create_refresh_token_value()

    db.add(
        RefreshToken(
            user_id=user_id,
            token_hash=hash_token(token),
            expires_at=refresh_token_expiry(),
        )
    )

    await db.flush()
    return token


async def _issue_customer_tokens(
    db: AsyncSession,
    user: User,
    response: Response,
) -> TokenResponse:
    access_token = create_access_token(
        str(user.id),
        extra_claims={"role": user.role.value},
    )

    refresh_token = await _create_refresh_token(db, user.id)

    clear_admin_refresh_cookie(response)
    set_refresh_cookie(response, refresh_token)

    return TokenResponse(access_token=access_token)


async def _issue_admin_tokens(
    db: AsyncSession,
    user: User,
    response: Response,
) -> TokenResponse:
    access_token = create_access_token(
        str(user.id),
        extra_claims={"role": user.role.value},
    )

    refresh_token = await _create_refresh_token(db, user.id)

    clear_refresh_cookie(response)
    set_admin_refresh_cookie(response, refresh_token)

    return TokenResponse(access_token=access_token)


async def _revoke_refresh_cookie(
    db: AsyncSession,
    raw_token: str | None,
) -> None:
    if not raw_token:
        return

    token_hash = hash_token(raw_token)

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash
        )
    )

    stored = result.scalar_one_or_none()

    if stored and stored.revoked_at is None:
        stored.revoked_at = datetime.now(timezone.utc)


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    body: RegisterRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    existing = await db.execute(
        select(User).where(User.email == body.email)
    )

    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=UserRole.CUSTOMER,
    )

    db.add(user)
    await db.flush()

    session_id = get_cart_session_id(request)

    if session_id:
        await cart_service.merge_guest_cart(
            db,
            user.id,
            session_id,
        )

    return await _issue_customer_tokens(
        db,
        user,
        response,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    body: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    result = await db.execute(
        select(User).where(User.email == body.email)
    )

    user = result.scalar_one_or_none()

    if not user or not verify_password(
        body.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    if user.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts must sign in at /admin/login",
        )

    session_id = get_cart_session_id(request)

    if session_id:
        await cart_service.merge_guest_cart(
            db,
            user.id,
            session_id,
        )

    return await _issue_customer_tokens(
        db,
        user,
        response,
    )


@router.post("/google", response_model=TokenResponse)
async def google_login(
    body: GoogleLoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Authenticate a customer using a Google Identity Services ID token.

    The Google token is verified server-side before the Velora
    access token and refresh cookie are issued.
    """

    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google login is not configured",
        )

    try:
        id_info = id_token.verify_oauth2_token(
    body.google_token,
    google_requests.Request(),
    settings.google_client_id,
)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token",
        )

    google_sub = id_info.get("sub")
    email = id_info.get("email")
    name = id_info.get("name")

    if not google_sub or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account information is incomplete",
        )

    if not id_info.get("email_verified", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Google email is not verified",
        )

    email = email.strip().lower()

    if not name:
        name = email.split("@")[0]

    # First try to find the user by Google's unique subject ID.
    result = await db.execute(
        select(User).where(User.google_sub == google_sub)
    )

    user = result.scalar_one_or_none()

    # If Google account is not linked yet, check whether
    # the email already belongs to an existing Velora account.
    if not user:
        result = await db.execute(
            select(User).where(User.email == email)
        )

        user = result.scalar_one_or_none()

    if user:
        # Google login is only for customer accounts.
        if user.role == UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin accounts must sign in at /admin/login",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is inactive",
            )

        # Link this Google account to the existing customer account.
        if user.google_sub != google_sub:
            user.google_sub = google_sub

    else:
        # Create a new customer account.
        #
        # A random password is generated because Google users
        # authenticate through Google instead of Velora password login.
        user = User(
            name=name,
            email=email,
            password_hash=hash_password(uuid.uuid4().hex),
            google_sub=google_sub,
            role=UserRole.CUSTOMER,
        )

        db.add(user)
        await db.flush()

    # Merge guest cart into the authenticated customer cart.
    session_id = get_cart_session_id(request)

    if session_id:
        await cart_service.merge_guest_cart(
            db,
            user.id,
            session_id,
        )

    # Use the same Velora JWT + refresh-cookie system
    # used by normal customer login.
    return await _issue_customer_tokens(
        db,
        user,
        response,
    )


@router.post("/admin/login", response_model=TokenResponse)
async def admin_login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    result = await db.execute(
        select(User).where(User.email == body.email)
    )

    user = result.scalar_one_or_none()

    if not user or not verify_password(
        body.password,
        user.password_hash,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    if user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account does not have admin access. Use customer login instead.",
        )

    return await _issue_admin_tokens(
        db,
        user,
        response,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    raw_token = request.cookies.get(REFRESH_COOKIE_NAME)

    if not raw_token:
        clear_refresh_cookie(response)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    token_hash = hash_token(raw_token)

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
        )
    )

    stored = result.scalar_one_or_none()

    if not stored or stored.expires_at < datetime.now(timezone.utc):
        clear_refresh_cookie(response)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    stored.revoked_at = datetime.now(timezone.utc)

    user_result = await db.execute(
        select(User).where(
            User.id == stored.user_id,
            User.is_active.is_(True),
        )
    )

    user = user_result.scalar_one_or_none()

    if not user:
        clear_refresh_cookie(response)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.role == UserRole.ADMIN:
        clear_refresh_cookie(response)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin session invalid for customer refresh. Sign in at /admin/login",
        )

    return await _issue_customer_tokens(
        db,
        user,
        response,
    )


@router.post("/admin/refresh", response_model=TokenResponse)
async def admin_refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    raw_token = request.cookies.get(ADMIN_REFRESH_COOKIE_NAME)

    if not raw_token:
        clear_admin_refresh_cookie(response)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )

    token_hash = hash_token(raw_token)

    result = await db.execute(
        select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
        )
    )

    stored = result.scalar_one_or_none()

    if not stored or stored.expires_at < datetime.now(timezone.utc):
        clear_admin_refresh_cookie(response)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    stored.revoked_at = datetime.now(timezone.utc)

    user_result = await db.execute(
        select(User).where(
            User.id == stored.user_id,
            User.is_active.is_(True),
        )
    )

    user = user_result.scalar_one_or_none()

    if not user:
        clear_admin_refresh_cookie(response)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if user.role != UserRole.ADMIN:
        clear_admin_refresh_cookie(response)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin access required",
        )

    return await _issue_admin_tokens(
        db,
        user,
        response,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await _revoke_refresh_cookie(
        db,
        request.cookies.get(REFRESH_COOKIE_NAME),
    )

    clear_refresh_cookie(response)

    return MessageResponse(
        message="Logged out successfully"
    )


@router.post("/admin/logout", response_model=MessageResponse)
async def admin_logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await _revoke_refresh_cookie(
        db,
        request.cookies.get(ADMIN_REFRESH_COOKIE_NAME),
    )

    clear_admin_refresh_cookie(response)

    return MessageResponse(
        message="Logged out successfully"
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    user: User = Depends(get_current_user),
) -> User:
    return user


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    message = await password_reset_service.request_password_reset(
        db,
        email=str(body.email),
        scope="customer",
    )

    return MessageResponse(message=message)


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    message = await password_reset_service.reset_password(
        db,
        token=body.token,
        password=body.password,
        confirm_password=body.confirm_password,
        scope="customer",
    )

    return MessageResponse(message=message)


@router.post(
    "/admin/forgot-password",
    response_model=MessageResponse,
)
async def admin_forgot_password(
    body: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    message = await password_reset_service.request_password_reset(
        db,
        email=str(body.email),
        scope="admin",
    )

    return MessageResponse(message=message)


@router.post(
    "/admin/reset-password",
    response_model=MessageResponse,
)
async def admin_reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    message = await password_reset_service.reset_password(
        db,
        token=body.token,
        password=body.password,
        confirm_password=body.confirm_password,
        scope="admin",
    )

    return MessageResponse(message=message)