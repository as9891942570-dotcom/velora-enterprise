import math
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.common import PaginatedResponse
from app.schemas.review import (
    ReviewCreate,
    ReviewEligibilityResponse,
    ReviewResponse,
    ReviewUpdate,
)
from app.services import review_service

router = APIRouter()


@router.get("/eligibility/{order_id}", response_model=ReviewEligibilityResponse)
async def review_eligibility(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReviewEligibilityResponse:
    return await review_service.get_review_eligibility(db, user.id, order_id)


@router.get("/product/{product_id}", response_model=PaginatedResponse[ReviewResponse])
async def product_reviews(
    product_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[ReviewResponse]:
    reviews, total = await review_service.list_product_reviews(db, product_id, page=page, page_size=page_size)
    pages = math.ceil(total / page_size) if total else 0
    return PaginatedResponse(
        items=[review_service.build_review_response(r) for r in reviews],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("", response_model=ReviewResponse, status_code=201)
async def create_review(
    body: ReviewCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReviewResponse:
    review = await review_service.create_review(db, user.id, body)
    return review_service.build_review_response(review)


@router.patch("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: uuid.UUID,
    body: ReviewUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> ReviewResponse:
    review = await review_service.update_own_review(db, review_id, user.id, body)
    return review_service.build_review_response(review)
