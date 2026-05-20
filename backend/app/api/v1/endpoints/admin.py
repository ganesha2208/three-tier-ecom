from fastapi import APIRouter, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import selectinload

from app.core.deps import CurrentAdmin, DbSession
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.models.user import User
from app.schemas.order import OrderOut, OrderStatusUpdate
from app.schemas.user import UserOut

router = APIRouter()


@router.get("/stats")
def stats(db: DbSession, _: CurrentAdmin) -> dict:
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_products = db.query(func.count(Product.id)).scalar() or 0
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    revenue_cents = (
        db.query(func.coalesce(func.sum(Order.total_cents), 0))
        .filter(Order.status.in_([OrderStatus.paid, OrderStatus.shipped, OrderStatus.delivered]))
        .scalar()
        or 0
    )
    low_stock = db.query(func.count(Product.id)).filter(Product.stock <= 5).scalar() or 0
    return {
        "total_users": total_users,
        "total_products": total_products,
        "total_orders": total_orders,
        "revenue_cents": int(revenue_cents),
        "low_stock_products": low_stock,
    }


@router.get("/users", response_model=list[UserOut])
def list_users(db: DbSession, _: CurrentAdmin) -> list[UserOut]:
    return [UserOut.model_validate(u) for u in db.query(User).order_by(User.created_at.desc()).all()]


@router.get("/orders", response_model=list[OrderOut])
def list_orders(db: DbSession, _: CurrentAdmin) -> list[OrderOut]:
    orders = (
        db.query(Order)
        .options(selectinload(Order.items))
        .order_by(Order.created_at.desc())
        .all()
    )
    return [OrderOut.model_validate(o) for o in orders]


@router.patch("/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int, payload: OrderStatusUpdate, db: DbSession, _: CurrentAdmin
) -> OrderOut:
    order = db.get(Order, order_id)
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return OrderOut.model_validate(order)
