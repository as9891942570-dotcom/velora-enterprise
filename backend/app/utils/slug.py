import re
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


def slugify(name: str) -> str:
    slug = name.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_-]+", "-", slug)
    return slug.strip("-")


async def unique_slug(
    db: AsyncSession,
    model: type,
    name: str,
    *,
    exclude_id: uuid.UUID | None = None,
) -> str:
    base_slug = slugify(name) or "item"
    slug = base_slug
    counter = 1

    while True:
        query = select(model.id).where(model.slug == slug)
        if exclude_id:
            query = query.where(model.id != exclude_id)
        result = await db.execute(query)
        if result.scalar_one_or_none() is None:
            return slug
        slug = f"{base_slug}-{counter}"
        counter += 1
