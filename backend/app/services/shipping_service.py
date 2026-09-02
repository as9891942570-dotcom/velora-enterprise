from decimal import Decimal

from app.core.config import settings


def calculate_shipping(subtotal: Decimal) -> Decimal:
    free_min = Decimal(str(settings.free_shipping_min_order))
    flat_rate = Decimal(str(settings.shipping_flat_rate))
    if subtotal >= free_min:
        return Decimal("0")
    return flat_rate
