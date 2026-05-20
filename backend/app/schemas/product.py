from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.category import CategoryOut


class ProductImageIn(BaseModel):
    url: str = Field(min_length=1, max_length=500)
    alt: str = Field(default="", max_length=200)
    position: int = 0


class ProductImageOut(ProductImageIn):
    model_config = ConfigDict(from_attributes=True)
    id: int


class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=10_000)
    price_cents: int = Field(ge=0)
    compare_at_cents: int | None = Field(default=None, ge=0)
    currency: str = Field(default="USD", min_length=3, max_length=3)
    sku: str = Field(min_length=1, max_length=60)
    stock: int = Field(ge=0)
    is_active: bool = True
    is_featured: bool = False
    category_id: int


class ProductCreate(ProductBase):
    images: list[ProductImageIn] = Field(default_factory=list)


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10_000)
    price_cents: int | None = Field(default=None, ge=0)
    compare_at_cents: int | None = Field(default=None, ge=0)
    currency: str | None = Field(default=None, min_length=3, max_length=3)
    sku: str | None = Field(default=None, min_length=1, max_length=60)
    stock: int | None = Field(default=None, ge=0)
    is_active: bool | None = None
    is_featured: bool | None = None
    category_id: int | None = None
    images: list[ProductImageIn] | None = None


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    slug: str
    description: str
    price_cents: int
    compare_at_cents: int | None
    currency: str
    sku: str
    stock: int
    is_active: bool
    is_featured: bool
    rating_avg: float
    rating_count: int
    category: CategoryOut
    images: list[ProductImageOut]
    created_at: datetime


class ProductListOut(BaseModel):
    items: list[ProductOut]
    total: int
    page: int
    page_size: int
    pages: int
