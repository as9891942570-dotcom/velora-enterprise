"""Seed database with admin user, categories, and sample products.

Usage (from backend/ with venv active):
    python -m scripts.seed

Admin credentials are read from environment variables:
    ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME
"""

import asyncio
import os
import sys
from decimal import Decimal

from sqlalchemy import select

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.core.security import hash_password
from app.models.category import Category
from app.models.enums import UserRole
from app.models.product import Product, ProductImage
from app.models.user import User


CATEGORIES = [
    {
        "name": "Flower Pots",
        "slug": "flower-pots",
        "description": "Handcrafted ceramic and terracotta flower pots for indoor and outdoor spaces.",
    },
    {
        "name": "Lotus Aasans",
        "slug": "lotus-aasans",
        "description": "Elegant lotus-inspired seating and meditation aasans.",
    },
    {
        "name": "Decorative Keychains",
        "slug": "decorative-keychains",
        "description": "Artisan keychains with premium finishes and unique designs.",
    },
    {
        "name": "Home Decor",
        "slug": "home-decor",
        "description": "Curated decorative pieces to elevate your living spaces.",
    },
]

PRODUCTS = [
    {
        "name": "Terracotta Classic Pot",
        "slug": "terracotta-classic-pot",
        "short_description": "Hand-finished terracotta pot with natural earthy tones.",
        "description": "A timeless terracotta flower pot crafted by skilled artisans. Perfect for indoor plants and balcony gardens. Breathable clay promotes healthy root growth.",
        "price": Decimal("599.00"),
        "compare_at_price": Decimal("799.00"),
        "stock_quantity": 50,
        "category_slug": "flower-pots",
        "is_featured": True,
        "material": "Terracotta",
    },
    {
        "name": "Ivory Lotus Aasan",
        "slug": "ivory-lotus-aasan",
        "short_description": "Premium meditation aasan with lotus petal design.",
        "description": "An exquisite lotus aasan designed for meditation and mindful living. Soft ivory finish with detailed lotus petal embossing.",
        "price": Decimal("1299.00"),
        "compare_at_price": None,
        "stock_quantity": 25,
        "category_slug": "lotus-aasans",
        "is_featured": True,
        "material": "Premium Fabric & Foam",
    },
    {
        "name": "Brass Om Keychain",
        "slug": "brass-om-keychain",
        "short_description": "Elegant brass keychain with Om symbol.",
        "description": "A finely polished brass keychain featuring the sacred Om symbol. A meaningful gift and daily reminder of mindfulness.",
        "price": Decimal("249.00"),
        "compare_at_price": Decimal("349.00"),
        "stock_quantity": 100,
        "category_slug": "decorative-keychains",
        "is_featured": True,
        "material": "Brass",
    },
    {
        "name": "Marble Finish Vase",
        "slug": "marble-finish-vase",
        "short_description": "Sleek marble-finish decorative vase.",
        "description": "A contemporary decorative vase with a luxurious marble finish. Ideal as a standalone piece or with dried florals.",
        "price": Decimal("899.00"),
        "compare_at_price": None,
        "stock_quantity": 30,
        "category_slug": "home-decor",
        "is_featured": False,
        "material": "Ceramic",
    },
    {
        "name": "Mini Succulent Pot Set",
        "slug": "mini-succulent-pot-set",
        "short_description": "Set of 3 mini pots for succulents and cacti.",
        "description": "A charming set of three mini pots in complementary earth tones. Perfect for desk decor and small succulents.",
        "price": Decimal("449.00"),
        "compare_at_price": Decimal("549.00"),
        "stock_quantity": 75,
        "category_slug": "flower-pots",
        "is_featured": True,
        "material": "Ceramic",
    },
    {
        "name": "Velvet Meditation Cushion",
        "slug": "velvet-meditation-cushion",
        "short_description": "Plush velvet cushion for yoga and meditation.",
        "description": "A generously filled meditation cushion wrapped in premium velvet. Provides comfortable support for extended sitting practice.",
        "price": Decimal("1599.00"),
        "compare_at_price": None,
        "stock_quantity": 15,
        "category_slug": "lotus-aasans",
        "is_featured": False,
        "material": "Velvet & Cotton",
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        # Admin user bootstrap
        admin_email = settings.admin_email or os.environ.get("ADMIN_EMAIL", "")
        admin_password = settings.admin_password or os.environ.get("ADMIN_PASSWORD", "")
        reset_admin_password = os.environ.get("RESET_ADMIN_PASSWORD", "").lower() in ("1", "true", "yes")

        if admin_email and admin_password:
            result = await db.execute(select(User).where(User.email == admin_email))
            existing = result.scalar_one_or_none()

            if existing:
                changed = False
                if existing.role != UserRole.ADMIN:
                    existing.role = UserRole.ADMIN
                    changed = True
                    print(f"Updated role to ADMIN for: {admin_email}")

                if reset_admin_password and settings.debug:
                    existing.password_hash = hash_password(admin_password)
                    existing.is_active = True
                    changed = True
                    print(f"Reset admin password for: {admin_email} (RESET_ADMIN_PASSWORD=true)")
                elif not changed:
                    print(f"Admin user already exists: {admin_email}")
                    print("  To sync password in dev: python -m scripts.reset_admin")
                    print("  Or set RESET_ADMIN_PASSWORD=true and re-run seed")
            else:
                admin = User(
                    name=settings.admin_name,
                    email=admin_email,
                    password_hash=hash_password(admin_password),
                    role=UserRole.ADMIN,
                )
                db.add(admin)
                print(f"Created admin user: {admin_email}")
        else:
            print("Skipping admin creation — set ADMIN_EMAIL and ADMIN_PASSWORD in backend/.env")

        # Categories
        category_map: dict[str, Category] = {}
        for cat_data in CATEGORIES:
            result = await db.execute(select(Category).where(Category.slug == cat_data["slug"]))
            existing = result.scalar_one_or_none()
            if existing:
                category_map[cat_data["slug"]] = existing
            else:
                cat = Category(**cat_data)
                db.add(cat)
                await db.flush()
                category_map[cat_data["slug"]] = cat
                print(f"Created category: {cat_data['name']}")

        # Products
        for prod_data in PRODUCTS:
            result = await db.execute(select(Product).where(Product.slug == prod_data["slug"]))
            if result.scalar_one_or_none():
                print(f"Product already exists: {prod_data['name']}")
                continue

            category_slug = prod_data.pop("category_slug")
            product_name = prod_data["name"]
            category = category_map[category_slug]
            product = Product(category_id=category.id, **prod_data)
            db.add(product)
            await db.flush()

            placeholder = ProductImage(
                product_id=product.id,
                url=f"https://placehold.co/600x600/e8e4df/5c5346?text={product.name.replace(' ', '+')}",
                alt_text=product.name,
                sort_order=0,
            )
            db.add(placeholder)
            print(f"Created product: {product_name}")

        await db.commit()
        print("Seed completed successfully.")


if __name__ == "__main__":
    asyncio.run(seed())
