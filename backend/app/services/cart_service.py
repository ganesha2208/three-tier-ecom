from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.user import User


def get_or_create_cart(db: Session, user: User) -> Cart:
    cart = (
        db.query(Cart)
        .options(selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.images),
                 selectinload(Cart.items).selectinload(CartItem.product).selectinload(Product.category))
        .filter(Cart.user_id == user.id)
        .one_or_none()
    )
    if not cart:
        cart = Cart(user_id=user.id)
        db.add(cart)
        db.commit()
        db.refresh(cart)
    return cart


def add_to_cart(db: Session, user: User, product_id: int, quantity: int) -> Cart:
    product = db.get(Product, product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    if product.stock < quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock"
        )

    cart = get_or_create_cart(db, user)
    existing = next((i for i in cart.items if i.product_id == product_id), None)
    if existing:
        new_qty = existing.quantity + quantity
        if new_qty > product.stock:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock"
            )
        existing.quantity = new_qty
    else:
        cart.items.append(CartItem(product_id=product_id, quantity=quantity))

    db.commit()
    db.refresh(cart)
    return cart


def update_item(db: Session, user: User, item_id: int, quantity: int) -> Cart:
    cart = get_or_create_cart(db, user)
    item = next((i for i in cart.items if i.id == item_id), None)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    if item.product.stock < quantity:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Insufficient stock")
    item.quantity = quantity
    db.commit()
    db.refresh(cart)
    return cart


def remove_item(db: Session, user: User, item_id: int) -> Cart:
    cart = get_or_create_cart(db, user)
    item = next((i for i in cart.items if i.id == item_id), None)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    db.delete(item)
    db.commit()
    db.refresh(cart)
    return cart


def clear_cart(db: Session, user: User) -> Cart:
    cart = get_or_create_cart(db, user)
    for item in list(cart.items):
        db.delete(item)
    db.commit()
    db.refresh(cart)
    return cart


def serialize_cart(cart: Cart) -> dict:
    subtotal = sum(i.product.price_cents * i.quantity for i in cart.items)
    count = sum(i.quantity for i in cart.items)
    return {
        "items": cart.items,
        "subtotal_cents": subtotal,
        "item_count": count,
    }
