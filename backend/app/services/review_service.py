import uuid

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.enums import OrderStatus
from app.models.order import Order
from app.models.review import ProductReview
from app.models.user import User
from app.schemas.review import (
    ReviewCreate,
    ReviewEligibilityItem,
    ReviewEligibilityResponse,
    ReviewResponse,
    ReviewUpdate,
)


# ---------------------------------------------------------
# REVIEW RESPONSE
# ---------------------------------------------------------

def build_review_response(review: ProductReview) -> ReviewResponse:
    user = getattr(review, "user", None)
    product = getattr(review, "product", None)
    order = getattr(review, "order", None)

    return ReviewResponse(
        id=review.id,
        user_id=review.user_id,
        product_id=review.product_id,
        order_id=review.order_id,
        rating=review.rating,
        comment=review.comment,
        admin_reply=review.admin_reply,
        is_read=review.is_read,
        is_hidden=review.is_hidden,
        created_at=review.created_at,
        updated_at=review.updated_at,
        customer_name=user.name if user else None,
        product_name=product.name if product else None,
        product_slug=product.slug if product else None,
        order_number=order.order_number if order else None,
    )


# ---------------------------------------------------------
# RELATIONSHIP LOADING
# ---------------------------------------------------------

REVIEW_LOAD = (
    selectinload(ProductReview.user),
    selectinload(ProductReview.product),
    selectinload(ProductReview.order),
)


# ---------------------------------------------------------
# CUSTOMER REVIEW ELIGIBILITY
# ---------------------------------------------------------

async def get_review_eligibility(
    db: AsyncSession,
    user_id: uuid.UUID,
    order_id: uuid.UUID,
) -> ReviewEligibilityResponse:

    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == order_id)
    )

    order = result.scalar_one_or_none()

    if not order or order.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    existing = await db.execute(
        select(ProductReview).where(
            ProductReview.order_id == order.id,
            ProductReview.user_id == user_id,
        )
    )

    by_product = {
        review.product_id: review
        for review in existing.scalars().all()
    }

    items: list[ReviewEligibilityItem] = []

    for item in order.items:

        if not item.product_id:
            continue

        review = by_product.get(item.product_id)

        eligible = (
            order.status == OrderStatus.DELIVERED
            and review is None
        )

        reason = None

        if order.status != OrderStatus.DELIVERED:
            reason = (
                "Reviews can be submitted only after "
                "the order is delivered"
            )

        elif review:
            reason = (
                "You have already reviewed this product "
                "for this order"
            )

        items.append(
            ReviewEligibilityItem(
                product_id=item.product_id,
                product_name=item.product_name,
                product_slug=item.product_slug,
                eligible=eligible,
                existing_review_id=review.id if review else None,
                reason=reason,
            )
        )

    return ReviewEligibilityResponse(
        order_id=order.id,
        order_status=order.status.value,
        items=items,
    )


# ---------------------------------------------------------
# CREATE REVIEW
# ---------------------------------------------------------

async def create_review(
    db: AsyncSession,
    user_id: uuid.UUID,
    data: ReviewCreate,
) -> ProductReview:

    result = await db.execute(
        select(Order)
        .options(selectinload(Order.items))
        .where(Order.id == data.order_id)
    )

    order = result.scalar_one_or_none()

    if not order or order.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order not found",
        )

    if order.status != OrderStatus.DELIVERED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only review products from delivered orders",
        )

    belongs = any(
        item.product_id == data.product_id
        for item in order.items
    )

    if not belongs:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Product is not part of this order",
        )

    duplicate = await db.execute(
        select(ProductReview).where(
            ProductReview.user_id == user_id,
            ProductReview.product_id == data.product_id,
            ProductReview.order_id == data.order_id,
        )
    )

    if duplicate.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already reviewed this product for this order",
        )

    review = ProductReview(
        user_id=user_id,
        product_id=data.product_id,
        order_id=data.order_id,
        rating=data.rating,
        comment=data.comment.strip(),
    )

    db.add(review)

    await db.flush()

    # Reload after creating
    loaded = await db.execute(
        select(ProductReview)
        .options(*REVIEW_LOAD)
        .where(ProductReview.id == review.id)
    )

    return loaded.scalar_one()


# ---------------------------------------------------------
# CUSTOMER UPDATE OWN REVIEW
# ---------------------------------------------------------

async def update_own_review(
    db: AsyncSession,
    review_id: uuid.UUID,
    user_id: uuid.UUID,
    data: ReviewUpdate,
) -> ProductReview:

    result = await db.execute(
        select(ProductReview)
        .options(*REVIEW_LOAD)
        .where(ProductReview.id == review_id)
    )

    review = result.scalar_one_or_none()

    if not review or review.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    if data.rating is not None:
        review.rating = data.rating

    if data.comment is not None:
        review.comment = data.comment.strip()

    await db.flush()

    # Reload after update
    result = await db.execute(
        select(ProductReview)
        .options(*REVIEW_LOAD)
        .where(ProductReview.id == review_id)
    )

    return result.scalar_one()


# ---------------------------------------------------------
# LIST PUBLIC PRODUCT REVIEWS
# ---------------------------------------------------------

async def list_product_reviews(
    db: AsyncSession,
    product_id: uuid.UUID,
    *,
    page: int = 1,
    page_size: int = 20,
) -> tuple[list[ProductReview], int]:

    filters = [
        ProductReview.product_id == product_id,
        ProductReview.is_hidden.is_(False),
    ]

    total = (
        await db.execute(
            select(func.count(ProductReview.id))
            .where(*filters)
        )
    ).scalar_one()

    result = await db.execute(
        select(ProductReview)
        .options(*REVIEW_LOAD)
        .where(*filters)
        .order_by(ProductReview.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    return list(result.scalars().all()), total


# ---------------------------------------------------------
# LIST ADMIN REVIEWS
# ---------------------------------------------------------

async def list_admin_reviews(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 20,
    is_read: bool | None = None,
    rating: int | None = None,
    search: str | None = None,
) -> tuple[list[ProductReview], int]:

    query = select(ProductReview)
    count_query = select(func.count(ProductReview.id))

    if is_read is not None:

        query = query.where(
            ProductReview.is_read.is_(is_read)
        )

        count_query = count_query.where(
            ProductReview.is_read.is_(is_read)
        )

    if rating is not None:

        query = query.where(
            ProductReview.rating == rating
        )

        count_query = count_query.where(
            ProductReview.rating == rating
        )

    if search:

        term = f"%{search.strip()}%"

        search_filter = or_(
            User.name.ilike(term),
            User.email.ilike(term),
            ProductReview.comment.ilike(term),
        )

        query = (
            query
            .join(User, User.id == ProductReview.user_id)
            .where(search_filter)
        )

        count_query = (
            count_query
            .join(User, User.id == ProductReview.user_id)
            .where(search_filter)
        )

    total = (
        await db.execute(count_query)
    ).scalar_one()

    result = await db.execute(
        query
        .options(*REVIEW_LOAD)
        .order_by(ProductReview.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    return list(result.scalars().all()), total


# ---------------------------------------------------------
# GET SINGLE REVIEW
# ---------------------------------------------------------

async def get_review(
    db: AsyncSession,
    review_id: uuid.UUID,
) -> ProductReview:

    result = await db.execute(
        select(ProductReview)
        .options(*REVIEW_LOAD)
        .where(ProductReview.id == review_id)
    )

    review = result.scalar_one_or_none()

    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Review not found",
        )

    return review


# ---------------------------------------------------------
# ADMIN UPDATE REVIEW
# ---------------------------------------------------------

async def admin_update_review(
    db: AsyncSession,
    review_id: uuid.UUID,
    data: dict,
) -> ProductReview:

    review = await get_review(db, review_id)

    # Admin reply
    if "admin_reply" in data:

        reply = data["admin_reply"]

        review.admin_reply = (
            (reply or "").strip() or None
        )

        # Replying automatically marks review as read
        review.is_read = True

    # Mark read / unread
    if "is_read" in data:
        review.is_read = data["is_read"]

    # Hide / unhide
    if "is_hidden" in data:
        review.is_hidden = data["is_hidden"]

    await db.flush()

    # IMPORTANT:
    # Reload review after update.
    # This prevents MissingGreenlet when accessing
    # updated_at or database-generated values.
    result = await db.execute(
        select(ProductReview)
        .options(*REVIEW_LOAD)
        .where(ProductReview.id == review_id)
    )

    return result.scalar_one()