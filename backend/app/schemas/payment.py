from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import OrderStatus, PaymentMethod, PaymentRecordStatus, PaymentStatus


class PaymentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    order_id: UUID
    order_number: str
    customer_name: str
    customer_email: str
    total_amount: Decimal
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    order_status: OrderStatus
    transaction_id: str | None = None
    razorpay_order_id: str | None = None
    payment_record_status: PaymentRecordStatus | None = None
    created_at: datetime


class PaymentSummary(BaseModel):
    total_revenue: Decimal
    successful_payments: int
    pending_payments: int
    failed_payments: int
    refunded_amount: Decimal


class PaymentListResponse(BaseModel):
    items: list[PaymentListItem]
    total: int
    page: int
    page_size: int
    pages: int
    summary: PaymentSummary
