import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db
from app.models.category import Category
from app.schemas.category import CategoryResponse
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.get("", response_model=PaginatedResponse[CategoryResponse])
async def list_categories(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[CategoryResponse]:
    from sqlalchemy import func

    count_result = await db.execute(
        select(func.count(Category.id)).where(Category.is_active.is_(True))
    )
    total = count_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        select(Category)
        .where(Category.is_active.is_(True))
        .order_by(Category.name)
        .offset(offset)
        .limit(page_size)
    )
    categories = result.scalars().all()
    pages = math.ceil(total / page_size) if total else 0

    return PaginatedResponse(
        items=[CategoryResponse.model_validate(c) for c in categories],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{slug}", response_model=CategoryResponse)
async def get_category_by_slug(slug: str, db: AsyncSession = Depends(get_db)) -> Category:
    result = await db.execute(select(Category).where(Category.slug == slug, Category.is_active.is_(True)))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category
