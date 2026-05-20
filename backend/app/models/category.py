from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(140), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(String(500), nullable=False, default="")
    image_url: Mapped[str] = mapped_column(String(500), nullable=False, default="")

    products: Mapped[list["Product"]] = relationship(back_populates="category")  # noqa: F821
