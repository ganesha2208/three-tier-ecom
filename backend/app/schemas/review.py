from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str = Field(default="", max_length=200)
    body: str = Field(default="", max_length=5000)


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int
    product_id: int
    rating: int
    title: str
    body: str
    created_at: datetime
    user_name: str = ""

    @classmethod
    def from_orm_with_user(cls, review):
        return cls(
            id=review.id,
            user_id=review.user_id,
            product_id=review.product_id,
            rating=review.rating,
            title=review.title,
            body=review.body,
            created_at=review.created_at,
            user_name=review.user.full_name if review.user else "",
        )
