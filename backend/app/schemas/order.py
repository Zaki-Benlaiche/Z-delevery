"""مخططات الطلبات"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field, model_validator

from app.models.enums import OrderStatus, PaymentMethod, PaymentStatus
from app.schemas.common import LocationOut


class OrderItemIn(BaseModel):
    product_id: uuid.UUID
    qty: int = Field(default=1, ge=1)
    options: str | None = Field(default=None, max_length=255)


class OrderCreate(BaseModel):
    merchant_id: uuid.UUID
    items: list[OrderItemIn] = Field(..., min_length=1)
    payment_method: PaymentMethod = PaymentMethod.CASH

    # عنوان التسليم: إمّا معرّف عنوان محفوظ، أو إحداثيات مباشرة
    address_id: uuid.UUID | None = None
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)
    delivery_details: str | None = Field(default=None, max_length=255)

    @model_validator(mode="after")
    def _check_destination(self):
        if self.address_id is None and (self.lat is None or self.lng is None):
            raise ValueError("يلزم تحديد address_id أو إحداثيات (lat/lng) للتسليم")
        return self


class OrderItemOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: str
    qty: int
    unit_price: float
    options: str | None

    model_config = {"from_attributes": True}


class TrackingOut(BaseModel):
    status: OrderStatus
    location: LocationOut | None = None
    timestamp: datetime


class OrderOut(BaseModel):
    id: uuid.UUID
    customer_id: uuid.UUID
    merchant_id: uuid.UUID
    driver_id: uuid.UUID | None
    status: OrderStatus
    subtotal: float
    delivery_fee: float
    commission: float
    total: float
    payment_method: PaymentMethod
    payment_status: PaymentStatus
    delivery_location: LocationOut | None = None
    delivery_details: str | None
    items: list[OrderItemOut] = []
    created_at: datetime


class OrderStatusUpdate(BaseModel):
    status: OrderStatus
