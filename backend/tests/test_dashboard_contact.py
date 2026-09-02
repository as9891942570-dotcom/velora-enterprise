"""Tests for dashboard stats schema and contact message validation."""

from app.schemas.contact import ContactRequest
from app.schemas.dashboard import DashboardStatsResponse, InventorySummary, LowStockProduct


def test_dashboard_stats_schema():
    stats = DashboardStatsResponse(
        total_revenue="1000.00",
        total_orders=10,
        total_customers=5,
        total_products=6,
        total_categories=4,
        pending_orders=2,
        revenue_today="100.00",
        revenue_this_month="500.00",
        orders_today=1,
        orders_this_month=5,
        inventory=InventorySummary(
            total_products=6,
            in_stock_count=4,
            low_stock_count=1,
            out_of_stock_count=1,
        ),
        recent_orders=[],
        low_stock_products=[
            LowStockProduct(
                id="abc",
                name="Test",
                slug="test",
                stock_quantity=0,
                price="99.00",
                is_out_of_stock=True,
            )
        ],
    )
    assert stats.pending_orders == 2
    assert stats.inventory.out_of_stock_count == 1


def test_contact_request_validation():
    req = ContactRequest(
        name="Ankit",
        email="test@example.com",
        subject="Hello",
        message="I have a question about shipping.",
    )
    assert req.name == "Ankit"
