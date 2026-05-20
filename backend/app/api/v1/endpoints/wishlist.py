from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentUser, DbSession
from app.models.product import Product
from app.models.wishlist import WishlistItem
from app.schemas.wishlist import WishlistAdd, WishlistItemOut

router = APIRouter()


@router.get("", response_model=list[WishlistItemOut])
def list_wishlist(user: CurrentUser, db: DbSession) -> list[WishlistItemOut]:
    items = (
        db.query(WishlistItem)
        .options(
            selectinload(WishlistItem.product).selectinload(Product.images),
            selectinload(WishlistItem.product).selectinload(Product.category),
        )
        .filter(WishlistItem.user_id == user.id)
        .order_by(WishlistItem.created_at.desc())
        .all()
    )
    return [WishlistItemOut.model_validate(i) for i in items]


@router.post("", response_model=WishlistItemOut, status_code=status.HTTP_201_CREATED)
def add_wishlist(payload: WishlistAdd, user: CurrentUser, db: DbSession) -> WishlistItemOut:
    product = db.get(Product, payload.product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    existing = (
        db.query(WishlistItem)
        .filter(WishlistItem.user_id == user.id, WishlistItem.product_id == payload.product_id)
        .first()
    )
    if existing:
        return WishlistItemOut.model_validate(existing)
    item = WishlistItem(user_id=user.id, product_id=payload.product_id)
    db.add(item)
    db.commit()
    db.refresh(item)
    return WishlistItemOut.model_validate(item)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_wishlist(product_id: int, user: CurrentUser, db: DbSession) -> None:
    item = (
        db.query(WishlistItem)
        .filter(WishlistItem.user_id == user.id, WishlistItem.product_id == product_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not in wishlist")
    db.delete(item)
    db.commit()
