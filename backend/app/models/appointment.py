"""نموذج المواعيد الطبية — نظام طابور رقمي (clinic)"""
import uuid
from datetime import date

from sqlalchemy import Date, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin
from app.models.enums import AppointmentStatus


class Appointment(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "appointments"

    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("merchants.id", ondelete="CASCADE"), index=True
    )
    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    day: Mapped[date] = mapped_column(Date, index=True)
    queue_number: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(20), default=AppointmentStatus.WAITING.value, index=True)
