"""Idempotent seed script.

Run via: `python -m app.scripts.seed`
Creates first admin user, sample categories, and sample products.
Safe to run multiple times.
"""
from __future__ import annotations

from slugify import slugify
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.category import Category
from app.models.product import Product, ProductImage
from app.models.user import User, UserRole


CATEGORIES: list[dict] = [
    {
        "name": "Electronics",
        "description": "Phones, audio, wearables, and accessories.",
        "image_url": "https://images.unsplash.com/photo-1498049794561-7780e7231661?w=900",
    },
    {
        "name": "Fashion",
        "description": "Apparel and accessories for every season.",
        "image_url": "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=900",
    },
    {
        "name": "Home & Kitchen",
        "description": "Everything to make your home feel like home.",
        "image_url": "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900",
    },
    {
        "name": "Books",
        "description": "Bestsellers, classics, and indie picks.",
        "image_url": "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=900",
    },
    {
        "name": "Sports",
        "description": "Gear for every athlete and weekend warrior.",
        "image_url": "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=900",
    },
]


PRODUCTS: list[dict] = [
    # Electronics
    {
        "name": "Aurora Pro Wireless Headphones",
        "category": "Electronics",
        "price_cents": 24999,
        "compare_at_cents": 29999,
        "sku": "AUR-HP-001",
        "stock": 42,
        "is_featured": True,
        "description": "Over-ear ANC headphones with 40h battery, hi-res audio, and plush memory-foam earcups.",
        "images": [
            "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=900",
            "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=900",
        ],
    },
    {
        "name": "Nimbus Smartwatch S3",
        "category": "Electronics",
        "price_cents": 19999,
        "compare_at_cents": 22999,
        "sku": "NIM-SW-003",
        "stock": 30,
        "is_featured": True,
        "description": "GPS, ECG, SpO2, 7-day battery, swim-proof. Tracks 100+ workouts.",
        "images": [
            "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=900",
        ],
    },
    {
        "name": "Lumen 4K Webcam",
        "category": "Electronics",
        "price_cents": 8999,
        "sku": "LUM-WC-4K",
        "stock": 80,
        "description": "Studio-grade 4K webcam with HDR and dual mics. Plug-and-play USB-C.",
        "images": [
            "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?w=900",
        ],
    },
    {
        "name": "Pulse Mechanical Keyboard",
        "category": "Electronics",
        "price_cents": 13999,
        "sku": "PUL-KB-87",
        "stock": 55,
        "description": "TKL hot-swap keyboard with PBT keycaps and customizable RGB.",
        "images": [
            "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=900",
        ],
    },
    # Fashion
    {
        "name": "Heritage Leather Backpack",
        "category": "Fashion",
        "price_cents": 14900,
        "sku": "HER-BP-001",
        "stock": 25,
        "is_featured": True,
        "description": "Full-grain leather, 18L capacity, padded 15\" laptop sleeve.",
        "images": [
            "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=900",
        ],
    },
    {
        "name": "Cloudstride Runners",
        "category": "Fashion",
        "price_cents": 9999,
        "compare_at_cents": 12000,
        "sku": "CLD-SH-RUN",
        "stock": 100,
        "description": "Featherlight knit upper, responsive foam midsole.",
        "images": [
            "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900",
        ],
    },
    {
        "name": "Solstice Sunglasses",
        "category": "Fashion",
        "price_cents": 5999,
        "sku": "SOL-SG-PLR",
        "stock": 60,
        "description": "Polarized lenses, acetate frame, scratch-resistant coating.",
        "images": [
            "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=900",
        ],
    },
    # Home & Kitchen
    {
        "name": "Brew Master Espresso Machine",
        "category": "Home & Kitchen",
        "price_cents": 39999,
        "sku": "BRW-EM-PRO",
        "stock": 18,
        "is_featured": True,
        "description": "15-bar pump, integrated grinder, steam wand for microfoam.",
        "images": [
            "https://images.unsplash.com/photo-1572119865084-43c285814d63?w=900",
        ],
    },
    {
        "name": "Ember Cast Iron Skillet 12\"",
        "category": "Home & Kitchen",
        "price_cents": 4999,
        "sku": "EMB-CI-12",
        "stock": 70,
        "description": "Pre-seasoned, oven-safe to 500°F. A lifetime cookware staple.",
        "images": [
            "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=900",
        ],
    },
    {
        "name": "Aero Air Purifier",
        "category": "Home & Kitchen",
        "price_cents": 17999,
        "sku": "AER-AP-01",
        "stock": 22,
        "description": "True HEPA filtration, covers up to 540 sq ft, whisper-quiet.",
        "images": [
            "https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=900",
        ],
    },
    # Books
    {
        "name": "The Designer's Field Guide",
        "category": "Books",
        "price_cents": 2999,
        "sku": "BK-DFG-01",
        "stock": 200,
        "description": "Practical, opinionated guidance for working designers.",
        "images": [
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=900",
        ],
    },
    {
        "name": "Calm Code",
        "category": "Books",
        "price_cents": 2599,
        "sku": "BK-CC-001",
        "stock": 150,
        "description": "Engineering for sustainable focus and long careers.",
        "images": [
            "https://images.unsplash.com/photo-1532012197267-da84d127e765?w=900",
        ],
    },
    # Sports
    {
        "name": "Apex Yoga Mat 6mm",
        "category": "Sports",
        "price_cents": 4500,
        "sku": "APX-YM-6",
        "stock": 90,
        "description": "Eco-friendly TPE, non-slip texture, generous 72\" length.",
        "images": [
            "https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=900",
        ],
    },
    {
        "name": "Vector Adjustable Dumbbells",
        "category": "Sports",
        "price_cents": 29999,
        "compare_at_cents": 34999,
        "sku": "VEC-AD-50",
        "stock": 12,
        "is_featured": True,
        "description": "Quick-twist 5-50 lb per dumbbell. Saves space, scales with you.",
        "images": [
            "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=900",
        ],
    },
]


def _ensure_admin(db: Session) -> None:
    email = settings.FIRST_ADMIN_EMAIL.lower()
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        if existing.role != UserRole.admin:
            existing.role = UserRole.admin
            db.commit()
        return
    admin = User(
        email=email,
        hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
        full_name="Site Admin",
        role=UserRole.admin,
    )
    db.add(admin)
    db.commit()
    print(f"[seed] created admin {email}")


def _ensure_categories(db: Session) -> dict[str, Category]:
    by_name: dict[str, Category] = {}
    for c in CATEGORIES:
        cat = db.query(Category).filter(Category.name == c["name"]).first()
        if not cat:
            cat = Category(
                name=c["name"],
                slug=slugify(c["name"]),
                description=c["description"],
                image_url=c["image_url"],
            )
            db.add(cat)
            db.commit()
            db.refresh(cat)
            print(f"[seed] category: {cat.name}")
        by_name[c["name"]] = cat
    return by_name


def _ensure_products(db: Session, cats: dict[str, Category]) -> None:
    for p in PRODUCTS:
        existing = db.query(Product).filter(Product.sku == p["sku"]).first()
        if existing:
            continue
        prod = Product(
            name=p["name"],
            slug=slugify(p["name"]),
            description=p["description"],
            price_cents=p["price_cents"],
            compare_at_cents=p.get("compare_at_cents"),
            sku=p["sku"],
            stock=p["stock"],
            is_featured=p.get("is_featured", False),
            category_id=cats[p["category"]].id,
        )
        for i, url in enumerate(p["images"]):
            prod.images.append(ProductImage(url=url, alt=p["name"], position=i))
        db.add(prod)
        db.commit()
        print(f"[seed] product: {prod.name}")


def run() -> None:
    if not settings.SEED_ON_STARTUP:
        print("[seed] SEED_ON_STARTUP=false — skipping")
        return
    db = SessionLocal()
    try:
        _ensure_admin(db)
        cats = _ensure_categories(db)
        _ensure_products(db, cats)
        print("[seed] done")
    finally:
        db.close()


if __name__ == "__main__":
    run()
