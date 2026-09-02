from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.order import OrderResponse


class LowStockProduct(BaseModel):
    id: str
    name: str
    slug: str
    stock_quantity: int
    price: str
    category_name: str | None = None
    is_out_of_stock: bool = False


class InventorySummary(BaseModel):
    total_products: int
    in_stock_count: int
    low_stock_count: int
    out_of_stock_count: int


class RevenueAnalytics(BaseModel):
    total_revenue: Decimal
    revenue_today: Decimal
    revenue_this_month: Decimal
    orders_today: int
    orders_this_month: int


class DashboardStatsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total_revenue: str
    total_orders: int
    total_customers: int
    total_products: int
    total_categories: int
    pending_orders: int
    revenue_today: str
    revenue_this_month: str
    orders_today: int
    orders_this_month: int
    inventory: InventorySummary
    recent_orders: list[OrderResponse]
    low_stock_products: list[LowStockProduct]
