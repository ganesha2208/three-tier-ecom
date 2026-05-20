from fastapi import APIRouter, HTTPException, status
from sqlalchemy.orm import joinedload

from app.core.deps import CurrentUser, DbSession
from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import Product
from app.models.review import Review
from app.schemas.review import ReviewCreate, ReviewOut
from app.services import product_service

router = APIRouter()


@router.get("/product/{product_id}", response_model=list[ReviewOut])
def list_for_product(product_id: int, db: DbSession) -> list[ReviewOut]:
    reviews = (
        db.query(Review)
        .options(joinedload(Review.user))
        .filter(Review.product_id == product_id)
        .order_by(Review.created_at.desc())
        .all()
    )
    return [ReviewOut.from_orm_with_user(r) for r in reviews]


@router.post("/product/{product_id}", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    product_id: int, payload: ReviewCreate, user: CurrentUser, db: DbSession
) -> ReviewOut:
    product = db.get(Product, product_id)
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Optional: enforce purchase before review
    purchased = (
        db.query(OrderItem)
        .join(Order)
        .filter(
            Order.user_id == user.id,
            OrderItem.product_id == product_id,
            Order.status.in_(
                [OrderStatus.paid, OrderStatus.shipped, OrderStatus.delivered]
            ),
        )
        .first()
    )
    if not purchased:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only review products you have purchased",
        )

    if db.query(Review).filter(Review.user_id == user.id, Review.product_id == product_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="You already reviewed this product"
        )

    review = Review(
        user_id=user.id,
        product_id=product_id,
        rating=payload.rating,
        title=payload.title,
        body=payload.body,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    product_service.recompute_rating(db, product_id)
    db.refresh(review)
    return ReviewOut.from_orm_with_user(review)
