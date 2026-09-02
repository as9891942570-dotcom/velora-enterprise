from fastapi import APIRouter, Depends

from app.api.v1.admin import categories, dashboard, messages, orders, products, upload
from app.core.deps import require_admin

router = APIRouter(dependencies=[Depends(require_admin)])

router.include_router(dashboard.router, prefix="/dashboard", tags=["admin-dashboard"])
router.include_router(categories.router, prefix="/categories", tags=["admin-categories"])
router.include_router(products.router, prefix="/products", tags=["admin-products"])
router.include_router(orders.router, prefix="/orders", tags=["admin-orders"])
router.include_router(messages.router, prefix="/messages", tags=["admin-messages"])
router.include_router(upload.router, prefix="/upload", tags=["admin-upload"])
