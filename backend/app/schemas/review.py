from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    order_id: UUID
    product_id: UUID
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=5, max_length=2000)


class ReviewUpdate(BaseModel):
    rating: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = Field(default=None, min_length=5, max_length=2000)


class AdminReviewUpdate(BaseModel):
    admin_reply: str | None = Field(default=None, max_length=2000)
    is_read: bool | None = None
    is_hidden: bool | None = None


class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    product_id: UUID
    order_id: UUID
    rating: int
    comment: str
    admin_reply: str | None
    is_read: bool
    is_hidden: bool
    created_at: datetime
    updated_at: datetime
    customer_name: str | None = None
    product_name: str | None = None
    product_slug: str | None = None
    order_number: str | None = None


class ReviewEligibilityItem(BaseModel):
    product_id: UUID
    product_name: str
    product_slug: str
    eligible: bool
    existing_review_id: UUID | None = None
    reason: str | None = None


class ReviewEligibilityResponse(BaseModel):
    order_id: UUID
    order_status: str
    items: list[ReviewEligibilityItem]
