from fastapi import HTTPException, status
from slugify import slugify
from sqlalchemy.orm import Session

from app.models.category import Category
from app.schemas.category import CategoryCreate, CategoryUpdate


def _unique_slug(db: Session, base: str) -> str:
    slug = slugify(base) or "category"
    candidate = slug
    i = 2
    while db.query(Category).filter(Category.slug == candidate).first():
        candidate = f"{slug}-{i}"
        i += 1
    return candidate


def list_categories(db: Session) -> list[Category]:
    return db.query(Category).order_by(Category.name.asc()).all()


def create_category(db: Session, payload: CategoryCreate) -> Category:
    if db.query(Category).filter(Category.name == payload.name).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Name in use")
    c = Category(
        name=payload.name,
        slug=_unique_slug(db, payload.name),
        description=payload.description,
        image_url=payload.image_url,
    )
    db.add(c)
    db.commit()
    db.refresh(c)
    return c


def update_category(db: Session, category_id: int, payload: CategoryUpdate) -> Category:
    c = db.get(Category, category_id)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] != c.name:
        c.slug = _unique_slug(db, data["name"])
    for k, v in data.items():
        setattr(c, k, v)
    db.commit()
    db.refresh(c)
    return c


def delete_category(db: Session, category_id: int) -> None:
    c = db.get(Category, category_id)
    if not c:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    if c.products:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete category with products",
        )
    db.delete(c)
    db.commit()
