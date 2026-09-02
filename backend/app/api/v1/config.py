from fastapi import APIRouter

from app.core.config import settings

router = APIRouter()


@router.get("")
async def get_public_config() -> dict:
    """Public storefront configuration (no secrets)."""
    return {
        "business_name": settings.app_name.replace(" API", ""),
        "support_email": settings.support_email,
        "shipping_flat_rate": settings.shipping_flat_rate,
        "free_shipping_min_order": settings.free_shipping_min_order,
        "low_stock_threshold": settings.low_stock_threshold,
        "online_payment_available": settings.razorpay_enabled,
    }
