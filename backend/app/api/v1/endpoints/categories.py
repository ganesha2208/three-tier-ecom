from fastapi import APIRouter, status

from app.core.deps import CurrentAdmin, DbSession
from app.schemas.category import CategoryCreate, CategoryOut, CategoryUpdate
from app.services import category_service

router = APIRouter()


@router.get("", response_model=list[CategoryOut])
def list_categories(db: DbSession) -> list[CategoryOut]:
    return [CategoryOut.model_validate(c) for c in category_service.list_categories(db)]


@router.post("", response_model=CategoryOut, status_code=status.HTTP_201_CREATED)
def create_category(payload: CategoryCreate, db: DbSession, _: CurrentAdmin) -> CategoryOut:
    return CategoryOut.model_validate(category_service.create_category(db, payload))


@router.patch("/{category_id}", response_model=CategoryOut)
def update_category(
    category_id: int, payload: CategoryUpdate, db: DbSession, _: CurrentAdmin
) -> CategoryOut:
    return CategoryOut.model_validate(
        category_service.update_category(db, category_id, payload)
    )


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_category(category_id: int, db: DbSession, _: CurrentAdmin) -> None:
    category_service.delete_category(db, category_id)
