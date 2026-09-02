import math
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_admin
from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryUpdate
from app.schemas.common import MessageResponse, PaginatedResponse
from app.utils.slug import unique_slug

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=PaginatedResponse[CategoryResponse])
async def list_categories(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[CategoryResponse]:
    total = (await db.execute(select(func.count(Category.id)))).scalar_one()
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Category).order_by(Category.name).offset(offset).limit(page_size)
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


@router.post("", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(body: CategoryCreate, db: AsyncSession = Depends(get_db)) -> Category:
    slug = await unique_slug(db, Category, body.name)
    category = Category(
        name=body.name,
        slug=slug,
        description=body.description,
        image_url=body.image_url,
        is_active=body.is_active,
    )
    db.add(category)
    await db.flush()
    await db.refresh(category)
    return category


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(category_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Category:
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    return category


@router.patch("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: uuid.UUID,
    body: CategoryUpdate,
    db: AsyncSession = Depends(get_db),
) -> Category:
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    update_data = body.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] != category.name:
        category.slug = await unique_slug(db, Category, update_data["name"], exclude_id=category.id)

    for field, value in update_data.items():
        setattr(category, field, value)

    await db.flush()
    await db.refresh(category)
    return category


@router.delete("/{category_id}", response_model=MessageResponse)
async def delete_category(category_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> MessageResponse:
    result = await db.execute(select(Category).where(Category.id == category_id))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")

    from app.models.product import Product

    linked = (await db.execute(select(func.count(Product.id)).where(Product.category_id == category_id))).scalar_one()
    if linked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with associated products",
        )

    await db.delete(category)
    return MessageResponse(message="Category deleted successfully")
