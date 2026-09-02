import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db
from app.models.category import Category
from app.models.product import Product
from app.schemas.common import PaginatedResponse
from app.schemas.product import ProductListResponse, ProductResponse

router = APIRouter()


def _product_list_item(product: Product) -> ProductListResponse:
    primary_image = product.images[0].url if product.images else None
    return ProductListResponse(
        id=product.id,
        name=product.name,
        slug=product.slug,
        short_description=product.short_description,
        price=product.price,
        compare_at_price=product.compare_at_price,
        stock_quantity=product.stock_quantity,
        is_active=product.is_active,
        is_featured=product.is_featured,
        primary_image_url=primary_image,
        category_slug=product.category.slug if product.category else None,
    )


@router.get("", response_model=PaginatedResponse[ProductListResponse])
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category: str | None = Query(None, description="Category slug"),
    search: str | None = Query(None),
    featured: bool | None = Query(None),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[ProductListResponse]:
    query = select(Product).where(Product.is_active.is_(True))
    count_query = select(func.count(Product.id)).where(Product.is_active.is_(True))

    if category:
        cat_result = await db.execute(select(Category.id).where(Category.slug == category, Category.is_active.is_(True)))
        category_id = cat_result.scalar_one_or_none()
        if not category_id:
            return PaginatedResponse(items=[], total=0, page=page, page_size=page_size, pages=0)
        query = query.where(Product.category_id == category_id)
        count_query = count_query.where(Product.category_id == category_id)

    if search:
        pattern = f"%{search}%"
        search_filter = or_(Product.name.ilike(pattern), Product.short_description.ilike(pattern))
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    if featured is not None:
        query = query.where(Product.is_featured.is_(featured))
        count_query = count_query.where(Product.is_featured.is_(featured))

    total_result = await db.execute(count_query)
    total = total_result.scalar_one()

    offset = (page - 1) * page_size
    result = await db.execute(
        query.options(selectinload(Product.images), selectinload(Product.category))
        .order_by(Product.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    products = result.scalars().all()
    pages = math.ceil(total / page_size) if total else 0

    return PaginatedResponse(
        items=[_product_list_item(p) for p in products],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{slug}", response_model=ProductResponse)
async def get_product_by_slug(slug: str, db: AsyncSession = Depends(get_db)) -> Product:
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.category))
        .where(Product.slug == slug, Product.is_active.is_(True))
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product
