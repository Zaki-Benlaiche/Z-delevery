"""مخططات السائق"""
import uuid

from pydantic import BaseModel, Field

from app.schemas.common import LocationOut
from app.schemas.order import OrderOut


class DriverRegister(BaseModel):
    vehicle_type: str = Field(default="moto", max_length=40, examples=["moto", "car", "bike"])
    license_url: str | None = None


class DriverLocationUpdate(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class DriverOut(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    vehicle_type: str
    license_url: str | None
    is_verified: bool
    is_online: bool
    rating: float
    current_location: LocationOut | None = None


class ContactOut(BaseModel):
    """جهة اتّصال (تاجر/زبون) — للسائق للتنسيق هاتفياً."""
    name: str | None = None
    phone: str | None = None


class PickupOut(BaseModel):
    """نقطة الاستلام = المتجر."""
    merchant_id: uuid.UUID
    name: str
    phone: str | None = None
    location: LocationOut | None = None


class DriverOrderDetail(OrderOut):
    """تفاصيل الطلب للسائق: يضيف نقطة الاستلام وجهة اتّصال الزبون."""
    pickup: PickupOut | None = None
    customer: ContactOut | None = None
