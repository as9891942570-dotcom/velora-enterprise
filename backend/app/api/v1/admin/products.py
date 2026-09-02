import math
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_db, require_admin
from app.models.category import Category
from app.models.product import Product, ProductImage
from app.schemas.common import MessageResponse, PaginatedResponse
from app.schemas.product import ProductCreate, ProductResponse, ProductUpdate
from app.utils.slug import unique_slug

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("", response_model=PaginatedResponse[ProductResponse])
async def list_products(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> PaginatedResponse[ProductResponse]:
    total = (await db.execute(select(func.count(Product.id)))).scalar_one()
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.category))
        .order_by(Product.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    products = result.scalars().all()
    pages = math.ceil(total / page_size) if total else 0
    return PaginatedResponse(
        items=[ProductResponse.model_validate(p) for p in products],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(body: ProductCreate, db: AsyncSession = Depends(get_db)) -> Product:
    cat_result = await db.execute(select(Category).where(Category.id == body.category_id))
    if not cat_result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")

    slug = await unique_slug(db, Product, body.name)
    product = Product(
        name=body.name,
        slug=slug,
        description=body.description,
        short_description=body.short_description,
        price=body.price,
        compare_at_price=body.compare_at_price,
        stock_quantity=body.stock_quantity,
        category_id=body.category_id,
        is_active=body.is_active,
        is_featured=body.is_featured,
        material=body.material,
    )
    db.add(product)
    await db.flush()

    for img in body.images:
        db.add(
            ProductImage(
                product_id=product.id,
                url=img.url,
                cloudinary_public_id=img.cloudinary_public_id,
                alt_text=img.alt_text,
                sort_order=img.sort_order,
            )
        )

    await db.flush()
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.category))
        .where(Product.id == product.id)
    )
    return result.scalar_one()


@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Product:
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.category))
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: uuid.UUID,
    body: ProductUpdate,
    db: AsyncSession = Depends(get_db),
) -> Product:
    result = await db.execute(
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.category))
        .where(Product.id == product_id)
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_data = body.model_dump(exclude_unset=True)
    images_data = update_data.pop("images", None)

    if "category_id" in update_data:
        cat_result = await db.execute(select(Category).where(Category.id == update_data["category_id"]))
        if not cat_result.scalar_one_or_none():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category not found")

    if "name" in update_data and update_data["name"] != product.name:
        product.slug = await unique_slug(db, Product, update_data["name"], exclude_id=product.id)

    for field, value in update_data.items():
        setattr(product, field, value)

    if images_data is not None:
        for image in list(product.images):
            await db.delete(image)
        for img in body.images or []:
            db.add(
                ProductImage(
                    product_id=product.id,
                    url=img.url,
                    cloudinary_public_id=img.cloudinary_public_id,
                    alt_text=img.alt_text,
                    sort_order=img.sort_order,
                )
            )

    await db.flush()
    refreshed = await db.execute(
        select(Product)
        .options(selectinload(Product.images), selectinload(Product.category))
        .where(Product.id == product.id)
    )
    return refreshed.scalar_one()


@router.delete("/{product_id}", response_model=MessageResponse)
async def delete_product(product_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> MessageResponse:
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    await db.delete(product)
    return MessageResponse(message="Product deleted successfully")
