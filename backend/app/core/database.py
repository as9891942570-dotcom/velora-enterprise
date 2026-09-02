from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


class Base(DeclarativeBase):
    pass


database_url = settings.database_url

# Remove sslmode because asyncpg doesn't support it
if database_url.startswith("postgresql+asyncpg://") and "sslmode=" in database_url:
    database_url = database_url.replace("?sslmode=require", "")
    database_url = database_url.replace("&sslmode=require", "")


engine = create_async_engine(
    database_url,
    echo=settings.debug,
    pool_pre_ping=True,
    connect_args={
        "ssl": "require",
    },
)


AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session