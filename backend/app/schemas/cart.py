from pydantic import BaseModel, ConfigDict, Field

from app.schemas.product import ProductOut


class CartItemIn(BaseModel):
    product_id: int
    quantity: int = Field(ge=1, le=999)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=1, le=999)


class CartItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    quantity: int
    product: ProductOut


class CartOut(BaseModel):
    items: list[CartItemOut]
    subtotal_cents: int
    item_count: int
