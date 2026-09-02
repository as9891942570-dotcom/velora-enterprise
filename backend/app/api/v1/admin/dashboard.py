from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_db, require_admin
from app.schemas.dashboard import DashboardStatsResponse
from app.services import dashboard_service

router = APIRouter(dependencies=[Depends(require_admin)])


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(db: AsyncSession = Depends(get_db)) -> DashboardStatsResponse:
    return await dashboard_service.get_dashboard_stats(db)
