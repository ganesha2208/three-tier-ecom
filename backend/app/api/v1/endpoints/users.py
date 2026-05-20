from fastapi import APIRouter, HTTPException, status

from app.core.deps import CurrentUser, DbSession
from app.models.user import Address
from app.schemas.user import AddressCreate, AddressOut, UserOut, UserUpdate

router = APIRouter()


@router.get("/me", response_model=UserOut)
def get_me(user: CurrentUser) -> UserOut:
    return UserOut.model_validate(user)


@router.patch("/me", response_model=UserOut)
def update_me(payload: UserUpdate, user: CurrentUser, db: DbSession) -> UserOut:
    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(user, k, v)
    db.commit()
    db.refresh(user)
    return UserOut.model_validate(user)


@router.get("/me/addresses", response_model=list[AddressOut])
def list_addresses(user: CurrentUser, db: DbSession) -> list[AddressOut]:
    return [AddressOut.model_validate(a) for a in user.addresses]


@router.post("/me/addresses", response_model=AddressOut, status_code=status.HTTP_201_CREATED)
def add_address(payload: AddressCreate, user: CurrentUser, db: DbSession) -> AddressOut:
    if payload.is_default:
        for a in user.addresses:
            a.is_default = False
    addr = Address(user_id=user.id, **payload.model_dump())
    db.add(addr)
    db.commit()
    db.refresh(addr)
    return AddressOut.model_validate(addr)


@router.delete("/me/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_address(address_id: int, user: CurrentUser, db: DbSession) -> None:
    addr = db.get(Address, address_id)
    if not addr or addr.user_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")
    db.delete(addr)
    db.commit()
