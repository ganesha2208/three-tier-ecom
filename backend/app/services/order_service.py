from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.models.order import Order, OrderItem, OrderStatus, PaymentStatus
from app.models.product import Product
from app.models.user import Address, User
from app.schemas.order import CheckoutIn
from app.services import cart_service


TAX_RATE_BPS = 800  # 8.00%
FREE_SHIPPING_THRESHOLD_CENTS = 5000
FLAT_SHIPPING_CENTS = 499


def _calculate_totals(subtotal_cents: int) -> tuple[int, int, int]:
    tax = subtotal_cents * TAX_RATE_BPS // 10_000
    shipping = 0 if subtotal_cents >= FREE_SHIPPING_THRESHOLD_CENTS else FLAT_SHIPPING_CENTS
    return tax, shipping, subtotal_cents + tax + shipping


def create_order_from_cart(
    db: Session,
    user: User,
    payload: CheckoutIn,
    idempotency_key: str | None = None,
) -> tuple[Order, str | None, bool]:
    # Idempotency: if this key already produced an order for this user, return it
    # instead of creating a duplicate (double-click / network retry).
    if idempotency_key:
        existing = (
            db.query(Order)
            .filter(Order.user_id == user.id, Order.idempotency_key == idempotency_key)
            .first()
        )
        if existing:
            return existing, None, existing.payment_intent_id.startswith("mock_pi_")

    cart = cart_service.get_or_create_cart(db, user)
    if not cart.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cart is empty")

    # Lock the product rows FOR UPDATE so two concurrent checkouts of the same
    # product serialize here -> stock can never be oversold.
    product_ids = [item.product_id for item in cart.items]
    locked = {
        p.id: p
        for p in db.query(Product)
        .filter(Product.id.in_(product_ids))
        .with_for_update()
        .all()
    }

    # Validate stock against the locked rows.
    for item in cart.items:
        product = locked[item.product_id]
        if product.stock < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for {product.name}",
            )

    subtotal = sum(locked[i.product_id].price_cents * i.quantity for i in cart.items)
    tax, shipping, total = _calculate_totals(subtotal)

    addr = payload.shipping_address
    order = Order(
        user_id=user.id,
        idempotency_key=idempotency_key,
        status=OrderStatus.pending,
        payment_status=PaymentStatus.pending,
        subtotal_cents=subtotal,
        tax_cents=tax,
        shipping_cents=shipping,
        total_cents=total,
        currency="USD",
        shipping_full_name=addr.full_name,
        shipping_line1=addr.line1,
        shipping_line2=addr.line2,
        shipping_city=addr.city,
        shipping_state=addr.state,
        shipping_postal_code=addr.postal_code,
        shipping_country=addr.country,
        shipping_phone=addr.phone,
    )

    for item in cart.items:
        p = locked[item.product_id]
        primary_image = p.images[0].url if p.images else ""
        order.items.append(
            OrderItem(
                product_id=p.id,
                name_snapshot=p.name,
                sku_snapshot=p.sku,
                image_snapshot=primary_image,
                unit_price_cents=p.price_cents,
                quantity=item.quantity,
                line_total_cents=p.price_cents * item.quantity,
            )
        )
        p.stock -= item.quantity

    # Optionally persist new address
    if payload.save_address:
        db.add(
            Address(
                user_id=user.id,
                full_name=addr.full_name,
                line1=addr.line1,
                line2=addr.line2,
                city=addr.city,
                state=addr.state,
                postal_code=addr.postal_code,
                country=addr.country,
                phone=addr.phone,
                is_default=addr.is_default,
            )
        )

    db.add(order)

    # Clear cart
    for item in list(cart.items):
        db.delete(item)

    db.commit()
    db.refresh(order)

    client_secret, is_mock = _create_payment_intent(order)
    db.commit()
    return order, client_secret, is_mock


def _create_payment_intent(order: Order) -> tuple[str | None, bool]:
    if not settings.STRIPE_SECRET_KEY:
        # Mock payment flow
        order.payment_intent_id = f"mock_pi_{order.id}"
        return None, True
    try:
        import stripe

        stripe.api_key = settings.STRIPE_SECRET_KEY
        intent = stripe.PaymentIntent.create(
            amount=order.total_cents,
            currency=order.currency.lower(),
            metadata={"order_id": str(order.id)},
            automatic_payment_methods={"enabled": True},
        )
        order.payment_intent_id = intent.id
        return intent.client_secret, False
    except Exception:
        # Fall back gracefully so checkout still works in dev
        order.payment_intent_id = f"mock_pi_{order.id}"
        return None, True


def mark_paid(db: Session, order: Order) -> Order:
    order.payment_status = PaymentStatus.succeeded
    order.status = OrderStatus.paid
    db.commit()
    db.refresh(order)
    return order


def list_user_orders(db: Session, user: User) -> list[Order]:
    return (
        db.query(Order)
        .options(selectinload(Order.items))
        .filter(Order.user_id == user.id)
        .order_by(Order.created_at.desc())
        .all()
    )


def get_order(db: Session, order_id: int, user: User | None = None) -> Order:
    q = db.query(Order).options(selectinload(Order.items)).filter(Order.id == order_id)
    order = q.one_or_none()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    if user is not None and order.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return order
