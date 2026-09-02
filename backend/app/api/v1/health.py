from fastapi import APIRouter
from sqlalchemy import text

from app.core.database import AsyncSessionLocal

router = APIRouter()


@router.get("/health")
async def health_check() -> dict[str, str]:
    database_status = "disconnected"

    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        database_status = "connected"
    except Exception:
        database_status = "disconnected"

    return {
        "status": "ok" if database_status == "connected" else "degraded",
        "database": database_status,
    }
