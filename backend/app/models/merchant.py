"""نماذج التاجر والمنتجات"""
import uuid

from geoalchemy2 import Geography
from sqlalchemy import Boolean, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class Merchant(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "merchants"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(160), index=True)
    # نصّ بدل Postgres ENUM لتسهيل التطوّر (القيم: food/fresh/market) — يُتحقّق منها في طبقة المخططات
    type: Mapped[str] = mapped_column(String(20), default="food", index=True)
    description: Mapped[str | None] = mapped_column(Text)
    logo_url: Mapped[str | None] = mapped_column(String(500))
    open_hours: Mapped[str | None] = mapped_column(String(255))
    is_open: Mapped[bool] = mapped_column(Boolean, default=True)
    rating: Mapped[float] = mapped_column(Numeric(2, 1), default=0)
    location: Mapped[object] = mapped_column(Geography(geometry_type="POINT", srid=4326))

    products: Mapped[list["Product"]] = relationship(
        back_populates="merchant", cascade="all, delete-orphan"
    )


class Product(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "products"

    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text)
    price: Mapped[float] = mapped_column(Numeric(10, 2))
    image_url: Mapped[str | None] = mapped_column(String(500))
    category: Mapped[str | None] = mapped_column(String(80))
    available: Mapped[bool] = mapped_column(Boolean, default=True)

    merchant: Mapped["Merchant"] = relationship(back_populates="products")
