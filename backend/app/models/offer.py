"""نموذج العروض الترويجية — بانرات يديرها التاجر وتظهر في رئيسية الزبون"""
import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin


class Offer(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "offers"

    merchant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(120))
    subtitle: Mapped[str | None] = mapped_column(Text)
    image_url: Mapped[str | None] = mapped_column(String(500))
    # نسبة خصم اختيارية تُعرض كشارة على البانر (مثال: 30 → "30%-")
    discount_pct: Mapped[int | None] = mapped_column(Integer)
    # نصّ شارة حرّ بديل عن الخصم (مثال: "كاش باك 20%")
    badge_text: Mapped[str | None] = mapped_column(String(40))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)

    merchant: Mapped["Merchant"] = relationship()  # noqa: F821
