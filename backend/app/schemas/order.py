import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator

from app.models.enums import CancelledByRole, OrderStatus, PaymentMethod, PaymentRecordStatus, PaymentStatus
from app.schemas.address import validate_indian_phone


PINCODE_PATTERN = r"^[1-9][0-9]{5}$"


class ShippingAddress(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=10, max_length=20)
    line1: str = Field(min_length=1, max_length=500)
    line2: str | None = None
    landmark: str | None = None
    city: str = Field(min_length=1, max_length=100)
    state: str = Field(min_length=1, max_length=100)
    pincode: str = Field(min_length=6, max_length=6)
    country: str = Field(default="IN", min_length=2, max_length=2)
    address_type: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        return validate_indian_phone(value)

    @field_validator("pincode")
    @classmethod
    def validate_pincode(cls, value: str) -> str:
        import re

        if not re.match(PINCODE_PATTERN, value):
            raise ValueError("Invalid Indian pincode")
        return value


class CheckoutRequest(BaseModel):
    customer_name: str = Field(min_length=1, max_length=255)
    customer_email: EmailStr
    customer_phone: str = Field(min_length=10, max_length=20)
    address_id: uuid.UUID | None = None
    shipping_address: ShippingAddress | None = None
    payment_method: PaymentMethod
    notes: str | None = None

    @field_validator("customer_phone")
    @classmethod
    def validate_customer_phone(cls, value: str) -> str:
        return validate_indian_phone(value)

    @model_validator(mode="after")
    def require_address(self) -> "CheckoutRequest":
        if not self.address_id and not self.shipping_address:
            raise ValueError("Either address_id or shipping_address is required")
        return self


class OrderItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID | None
    product_name: str
    product_slug: str
    unit_price: Decimal
    compare_at_price: Decimal | None
    quantity: int
    line_total: Decimal
    image_url: str | None


class OrderStatusHistoryResponse(BaseModel):
    status: OrderStatus
    note: str | None
    created_at: datetime


class OrderPaymentInfo(BaseModel):
    razorpay_order_id: str | None = None
    razorpay_payment_id: str | None = None
    payment_record_status: PaymentRecordStatus | None = None


class OrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_number: str
    status: OrderStatus
    payment_status: PaymentStatus
    payment_method: PaymentMethod
    subtotal: Decimal
    shipping_amount: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    customer_name: str
    customer_email: str
    customer_phone: str
    shipping_address: dict
    notes: str | None
    shipping_partner: str | None = None
    tracking_number: str | None = None
    confirmed_at: datetime | None = None
    processing_at: datetime | None = None
    shipped_at: datetime | None = None
    out_for_delivery_at: datetime | None = None
    delivered_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancelled_by_user_id: uuid.UUID | None = None
    cancelled_by_role: CancelledByRole | None = None
    cancellation_reason: str | None = None
    status_before_cancel: OrderStatus | None = None
    payment: OrderPaymentInfo | None = None
    items: list[OrderItemResponse]
    status_history: list[OrderStatusHistoryResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class CheckoutValidationResponse(BaseModel):
    valid: bool
    subtotal: Decimal
    shipping_amount: Decimal
    total_amount: Decimal
    item_count: int
    errors: list[str] = Field(default_factory=list)
    online_payment_available: bool = True


class RazorpayOrderInfo(BaseModel):
    razorpay_order_id: str
    amount: int
    currency: str
    key_id: str


class PaymentVerifyRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class OrderCreateResponse(OrderResponse):
    razorpay: RazorpayOrderInfo | None = None
    online_payment_available: bool = True
    message: str | None = None


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
    note: str | None = None
    cancellation_reason: str | None = Field(None, min_length=1, max_length=1000)
    shipping_partner: str | None = Field(None, max_length=255)
    tracking_number: str | None = Field(None, max_length=255)

    @model_validator(mode="after")
    def require_cancellation_reason(self) -> "OrderStatusUpdate":
        if self.status == OrderStatus.CANCELLED:
            reason = (self.cancellation_reason or self.note or "").strip()
            if not reason:
                raise ValueError("Cancellation reason is required")
            self.cancellation_reason = reason
        return self


class OrderCancelRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=1000)
