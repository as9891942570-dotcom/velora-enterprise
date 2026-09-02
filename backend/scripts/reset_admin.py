"""Reset bootstrap admin password (development only).

Usage (from backend/ with venv active):
    python -m scripts.reset_admin

Requires DEBUG=true in .env and ADMIN_EMAIL + ADMIN_PASSWORD set.
"""

import asyncio
import os
import sys

from sqlalchemy import select

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password, verify_password
from app.models.enums import UserRole
from app.models.user import User


async def reset_admin() -> None:
    if not settings.debug:
        print("ERROR: reset_admin is only allowed when DEBUG=true")
        sys.exit(1)

    admin_email = settings.admin_email or os.environ.get("ADMIN_EMAIL", "")
    admin_password = settings.admin_password or os.environ.get("ADMIN_PASSWORD", "")

    if not admin_email or not admin_password:
        print("ERROR: Set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env")
        sys.exit(1)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == admin_email))
        user = result.scalar_one_or_none()

        if not user:
            user = User(
                name=settings.admin_name or "Velora Admin",
                email=admin_email,
                password_hash=hash_password(admin_password),
                role=UserRole.ADMIN,
                is_active=True,
            )
            db.add(user)
            await db.commit()
            print(f"Created admin user: {admin_email}")
            return

        user.password_hash = hash_password(admin_password)
        user.role = UserRole.ADMIN
        user.is_active = True
        if settings.admin_name:
            user.name = settings.admin_name
        await db.commit()

        # Verify password works
        ok = verify_password(admin_password, user.password_hash)
        print(f"Reset admin password for: {admin_email}")
        print(f"Role: {user.role.value}")
        print(f"Password verification: {'OK' if ok else 'FAILED'}")


if __name__ == "__main__":
    asyncio.run(reset_admin())
