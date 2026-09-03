import math
import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_admin
from app.schemas.common import PaginatedResponse
from app.schemas.review import AdminReviewUpdate, ReviewResponse
from app.services import review_service

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=PaginatedResponse[ReviewResponse])
async def list_reviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    is_read: bool | None = Query(None),
    rating: int | None = Query(None, ge=1, le=5),
    search: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[ReviewResponse]:
    reviews, total = await review_service.list_admin_reviews(
        db, page=page, page_size=page_size, is_read=is_read, rating=rating, search=search
    )
    pages = math.ceil(total / page_size) if total else 0
    return PaginatedResponse(
        items=[review_service.build_review_response(r) for r in reviews],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.patch("/{review_id}", response_model=ReviewResponse)
async def update_review(
    review_id: uuid.UUID,
    body: AdminReviewUpdate,
    db: AsyncSession = Depends(get_db),
) -> ReviewResponse:
    review = await review_service.admin_update_review(
        db,
        review_id,
        body.model_dump(exclude_unset=True),
    )
    return review_service.build_review_response(review)
