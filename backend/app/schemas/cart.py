import uuid
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field


class CartItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(ge=1, default=1)


class CartItemSync(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(ge=1)


class CartSyncRequest(BaseModel):
    items: list[CartItemSync] = Field(default_factory=list)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1)


class CartItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    product_slug: str
    unit_price: Decimal
    quantity: int
    line_total: Decimal
    image_url: str | None
    stock_quantity: int
    in_stock: bool


class CartResponse(BaseModel):
    id: uuid.UUID
    items: list[CartItemResponse]
    item_count: int
    subtotal: Decimal
    shipping_amount: Decimal | None = None
    total_amount: Decimal | None = None
