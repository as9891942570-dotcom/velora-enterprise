from fastapi import APIRouter

from app.api.v1 import addresses, auth, cart, categories, checkout, config, contact, health, orders, products, reviews, webhooks
from app.api.v1.admin import router as admin_router

api_router = APIRouter()

api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(cart.router, prefix="/cart", tags=["cart"])
api_router.include_router(addresses.router, prefix="/addresses", tags=["addresses"])
api_router.include_router(checkout.router, prefix="/checkout", tags=["checkout"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
api_router.include_router(contact.router, prefix="/contact", tags=["contact"])
api_router.include_router(config.router, prefix="/config", tags=["config"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(admin_router, prefix="/admin")
