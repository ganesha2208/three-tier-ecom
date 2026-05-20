from math import ceil
from typing import Literal

from fastapi import HTTPException, status
from slugify import slugify
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models.product import Product, ProductImage
from app.models.review import Review
from app.schemas.product import ProductCreate, ProductUpdate


def _unique_slug(db: Session, base: str, model=Product) -> str:
    slug = slugify(base) or "item"
    candidate = slug
    i = 2
    while db.query(model).filter(model.slug == candidate).first():
        candidate = f"{slug}-{i}"
        i += 1
    return candidate


def list_products(
    db: Session,
    q: str | None = None,
    category_slug: str | None = None,
    min_cents: int | None = None,
    max_cents: int | None = None,
    sort: Literal["new", "price_asc", "price_desc", "rating", "popular"] = "new",
    page: int = 1,
    page_size: int = 12,
    only_active: bool = True,
    featured: bool | None = None,
) -> dict:
    from app.models.category import Category

    stmt = select(Product).options(
        selectinload(Product.images), selectinload(Product.category)
    )

    if only_active:
        stmt = stmt.where(Product.is_active.is_(True))
    if featured is not None:
        stmt = stmt.where(Product.is_featured.is_(featured))
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(
            or_(func.lower(Product.name).like(like), func.lower(Product.description).like(like))
        )
    if category_slug:
        stmt = stmt.join(Category).where(Category.slug == category_slug)
    if min_cents is not None:
        stmt = stmt.where(Product.price_cents >= min_cents)
    if max_cents is not None:
        stmt = stmt.where(Product.price_cents <= max_cents)

    if sort == "price_asc":
        stmt = stmt.order_by(Product.price_cents.asc())
    elif sort == "price_desc":
        stmt = stmt.order_by(Product.price_cents.desc())
    elif sort == "rating":
        stmt = stmt.order_by(Product.rating_avg.desc(), Product.rating_count.desc())
    elif sort == "popular":
        stmt = stmt.order_by(Product.rating_count.desc(), Product.created_at.desc())
    else:
        stmt = stmt.order_by(Product.created_at.desc())

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    page = max(1, page)
    page_size = max(1, min(60, page_size))
    items = db.scalars(stmt.offset((page - 1) * page_size).limit(page_size)).all()

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, ceil(total / page_size)) if total else 1,
    }


def get_product(db: Session, ident: str) -> Product:
    stmt = select(Product).options(
        selectinload(Product.images), selectinload(Product.category)
    )
    if ident.isdigit():
        stmt = stmt.where(Product.id == int(ident))
    else:
        stmt = stmt.where(Product.slug == ident)
    p = db.scalar(stmt)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    return p


def create_product(db: Session, payload: ProductCreate) -> Product:
    if db.query(Product).filter(Product.sku == payload.sku).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already exists")
    p = Product(
        name=payload.name,
        slug=_unique_slug(db, payload.name),
        description=payload.description,
        price_cents=payload.price_cents,
        compare_at_cents=payload.compare_at_cents,
        currency=payload.currency,
        sku=payload.sku,
        stock=payload.stock,
        is_active=payload.is_active,
        is_featured=payload.is_featured,
        category_id=payload.category_id,
    )
    for img in payload.images:
        p.images.append(ProductImage(url=img.url, alt=img.alt, position=img.position))
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


def update_product(db: Session, product_id: int, payload: ProductUpdate) -> Product:
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    data = payload.model_dump(exclude_unset=True)
    images = data.pop("images", None)
    if "sku" in data and data["sku"] != p.sku:
        if db.query(Product).filter(Product.sku == data["sku"]).first():
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="SKU already exists")

    if "name" in data and data["name"] != p.name:
        p.slug = _unique_slug(db, data["name"])

    for k, v in data.items():
        setattr(p, k, v)

    if images is not None:
        p.images.clear()
        db.flush()
        for img in images:
            p.images.append(ProductImage(url=img.url, alt=img.alt, position=img.position))

    db.commit()
    db.refresh(p)
    return p


def delete_product(db: Session, product_id: int) -> None:
    p = db.get(Product, product_id)
    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    db.delete(p)
    db.commit()


def recompute_rating(db: Session, product_id: int) -> None:
    p = db.get(Product, product_id)
    if not p:
        return
    avg = (
        db.query(func.avg(Review.rating)).filter(Review.product_id == product_id).scalar()
    ) or 0
    count = (
        db.query(func.count(Review.id)).filter(Review.product_id == product_id).scalar()
    ) or 0
    p.rating_avg = round(float(avg), 2)
    p.rating_count = int(count)
    db.commit()
