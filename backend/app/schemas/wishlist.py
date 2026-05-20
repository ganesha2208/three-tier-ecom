from pydantic import BaseModel, ConfigDict

from app.schemas.product import ProductOut


class WishlistItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product: ProductOut


class WishlistAdd(BaseModel):
    product_id: int
