from fastapi import APIRouter, status

from app.core.deps import CurrentUser, DbSession
from app.schemas.cart import CartItemIn, CartItemUpdate, CartOut
from app.services import cart_service

router = APIRouter()


@router.get("", response_model=CartOut)
def get_cart(user: CurrentUser, db: DbSession) -> CartOut:
    cart = cart_service.get_or_create_cart(db, user)
    return CartOut(**cart_service.serialize_cart(cart))


@router.post("/items", response_model=CartOut, status_code=status.HTTP_201_CREATED)
def add_item(payload: CartItemIn, user: CurrentUser, db: DbSession) -> CartOut:
    cart = cart_service.add_to_cart(db, user, payload.product_id, payload.quantity)
    return CartOut(**cart_service.serialize_cart(cart))


@router.patch("/items/{item_id}", response_model=CartOut)
def update_item(item_id: int, payload: CartItemUpdate, user: CurrentUser, db: DbSession) -> CartOut:
    cart = cart_service.update_item(db, user, item_id, payload.quantity)
    return CartOut(**cart_service.serialize_cart(cart))


@router.delete("/items/{item_id}", response_model=CartOut)
def delete_item(item_id: int, user: CurrentUser, db: DbSession) -> CartOut:
    cart = cart_service.remove_item(db, user, item_id)
    return CartOut(**cart_service.serialize_cart(cart))


@router.delete("", response_model=CartOut)
def clear(user: CurrentUser, db: DbSession) -> CartOut:
    cart = cart_service.clear_cart(db, user)
    return CartOut(**cart_service.serialize_cart(cart))
