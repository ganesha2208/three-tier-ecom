from fastapi import APIRouter, Header, HTTPException, Request, status

from app.core.config import settings
from app.core.deps import CurrentUser, DbSession
from app.models.order import Order, PaymentStatus
from app.schemas.order import CheckoutIn, CheckoutOut, OrderOut
from app.services import order_service

router = APIRouter()


@router.get("", response_model=list[OrderOut])
def list_orders(user: CurrentUser, db: DbSession) -> list[OrderOut]:
    return [OrderOut.model_validate(o) for o in order_service.list_user_orders(db, user)]


@router.get("/{order_id}", response_model=OrderOut)
def get_order(order_id: int, user: CurrentUser, db: DbSession) -> OrderOut:
    return OrderOut.model_validate(order_service.get_order(db, order_id, user))


@router.post("/checkout", response_model=CheckoutOut, status_code=status.HTTP_201_CREATED)
def checkout(
    payload: CheckoutIn,
    user: CurrentUser,
    db: DbSession,
    idempotency_key: str | None = Header(default=None, alias="Idempotency-Key"),
) -> CheckoutOut:
    order, client_secret, is_mock = order_service.create_order_from_cart(
        db, user, payload, idempotency_key
    )
    return CheckoutOut(
        order=OrderOut.model_validate(order),
        client_secret=client_secret,
        mock_payment=is_mock,
    )


@router.post("/{order_id}/confirm-mock-payment", response_model=OrderOut)
def confirm_mock_payment(order_id: int, user: CurrentUser, db: DbSession) -> OrderOut:
    """Confirm a mock payment for dev/demo when Stripe is not configured."""
    order = order_service.get_order(db, order_id, user)
    if not order.payment_intent_id.startswith("mock_pi_"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order uses real payment")
    if order.payment_status == PaymentStatus.succeeded:
        return OrderOut.model_validate(order)
    order_service.mark_paid(db, order)
    return OrderOut.model_validate(order)


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request, db: DbSession):
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Stripe not configured")
    import stripe

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid webhook: {e}")

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        order = (
            db.query(Order).filter(Order.payment_intent_id == intent["id"]).first()
        )
        if order and order.payment_status != PaymentStatus.succeeded:
            order_service.mark_paid(db, order)
    elif event["type"] == "payment_intent.payment_failed":
        intent = event["data"]["object"]
        order = (
            db.query(Order).filter(Order.payment_intent_id == intent["id"]).first()
        )
        if order:
            order.payment_status = PaymentStatus.failed
            db.commit()

    return {"received": True}
