from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.order import OrderStatus, PaymentStatus
from app.schemas.user import AddressBase


class CheckoutIn(BaseModel):
    shipping_address: AddressBase
    save_address: bool = False


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    name_snapshot: str
    sku_snapshot: str
    image_snapshot: str
    unit_price_cents: int
    quantity: int
    line_total_cents: int


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    status: OrderStatus
    payment_status: PaymentStatus
    subtotal_cents: int
    tax_cents: int
    shipping_cents: int
    total_cents: int
    currency: str

    shipping_full_name: str
    shipping_line1: str
    shipping_line2: str
    shipping_city: str
    shipping_state: str
    shipping_postal_code: str
    shipping_country: str
    shipping_phone: str

    payment_intent_id: str
    created_at: datetime
    items: list[OrderItemOut]


class CheckoutOut(BaseModel):
    order: OrderOut
    client_secret: str | None = None
    mock_payment: bool = False


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
