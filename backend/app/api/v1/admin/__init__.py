from fastapi import APIRouter, Depends

from app.api.v1.admin import cancellations, categories, dashboard, messages, notifications, orders, payments, products, reviews, upload
from app.core.deps import require_admin

router = APIRouter(dependencies=[Depends(require_admin)])

router.include_router(dashboard.router, prefix="/dashboard", tags=["admin-dashboard"])
router.include_router(categories.router, prefix="/categories", tags=["admin-categories"])
router.include_router(products.router, prefix="/products", tags=["admin-products"])
router.include_router(orders.router, prefix="/orders", tags=["admin-orders"])
router.include_router(messages.router, prefix="/messages", tags=["admin-messages"])
router.include_router(upload.router, prefix="/upload", tags=["admin-upload"])
router.include_router(reviews.router, prefix="/reviews", tags=["admin-reviews"])
router.include_router(payments.router, prefix="/payments", tags=["admin-payments"])
router.include_router(cancellations.router, prefix="/cancellation-requests", tags=["admin-cancellations"])
router.include_router(notifications.router, prefix="/notifications", tags=["admin-notifications"])
