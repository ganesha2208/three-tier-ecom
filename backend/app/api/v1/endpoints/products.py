from typing import Literal

from fastapi import APIRouter, Query, status

from app.core.deps import CurrentAdmin, DbSession
from app.schemas.product import (
    ProductCreate,
    ProductListOut,
    ProductOut,
    ProductUpdate,
)
from app.services import product_service

router = APIRouter()


@router.get("", response_model=ProductListOut)
def list_products(
    db: DbSession,
    q: str | None = None,
    category: str | None = None,
    min_cents: int | None = Query(default=None, ge=0),
    max_cents: int | None = Query(default=None, ge=0),
    sort: Literal["new", "price_asc", "price_desc", "rating", "popular"] = "new",
    featured: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=60),
) -> ProductListOut:
    result = product_service.list_products(
        db,
        q=q,
        category_slug=category,
        min_cents=min_cents,
        max_cents=max_cents,
        sort=sort,
        page=page,
        page_size=page_size,
        featured=featured,
    )
    return ProductListOut(
        items=[ProductOut.model_validate(p) for p in result["items"]],
        total=result["total"],
        page=result["page"],
        page_size=result["page_size"],
        pages=result["pages"],
    )


@router.get("/{ident}", response_model=ProductOut)
def get_product(ident: str, db: DbSession) -> ProductOut:
    return ProductOut.model_validate(product_service.get_product(db, ident))


@router.post("", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(payload: ProductCreate, db: DbSession, _: CurrentAdmin) -> ProductOut:
    return ProductOut.model_validate(product_service.create_product(db, payload))


@router.patch("/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int, payload: ProductUpdate, db: DbSession, _: CurrentAdmin
) -> ProductOut:
    return ProductOut.model_validate(product_service.update_product(db, product_id, payload))


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(product_id: int, db: DbSession, _: CurrentAdmin) -> None:
    product_service.delete_product(db, product_id)
