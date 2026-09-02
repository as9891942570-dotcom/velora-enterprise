import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.category import CategoryResponse
from app.utils.image_storage import validate_public_image_url


class ProductImageCreate(BaseModel):
    url: str = Field(min_length=1, max_length=500)
    cloudinary_public_id: str | None = None
    alt_text: str | None = None
    sort_order: int = 0

    @field_validator("url")
    @classmethod
    def validate_url(cls, value: str) -> str:
        return validate_public_image_url(value)


class ProductImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    url: str
    cloudinary_public_id: str | None
    alt_text: str | None
    sort_order: int


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    short_description: str | None = Field(default=None, max_length=500)
    price: Decimal = Field(gt=0)
    compare_at_price: Decimal | None = Field(default=None, gt=0)
    stock_quantity: int = Field(ge=0, default=0)
    category_id: uuid.UUID
    is_active: bool = True
    is_featured: bool = False
    material: str | None = None
    images: list[ProductImageCreate] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    short_description: str | None = Field(default=None, max_length=500)
    price: Decimal | None = Field(default=None, gt=0)
    compare_at_price: Decimal | None = None
    stock_quantity: int | None = Field(default=None, ge=0)
    category_id: uuid.UUID | None = None
    is_active: bool | None = None
    is_featured: bool | None = None
    material: str | None = None
    images: list[ProductImageCreate] | None = None


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    short_description: str | None
    price: Decimal
    compare_at_price: Decimal | None
    stock_quantity: int
    category_id: uuid.UUID
    is_active: bool
    is_featured: bool
    material: str | None
    images: list[ProductImageResponse]
    category: CategoryResponse | None = None
    created_at: datetime
    updated_at: datetime


class ProductListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    slug: str
    short_description: str | None
    price: Decimal
    compare_at_price: Decimal | None
    stock_quantity: int
    is_active: bool
    is_featured: bool
    primary_image_url: str | None = None
    category_slug: str | None = None
