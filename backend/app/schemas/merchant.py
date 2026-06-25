"""مخططات التاجر والمنتجات"""
import uuid

from pydantic import BaseModel, Field

from app.models.enums import MerchantType
from app.schemas.common import LocationOut


# ---------- المنتجات ----------
class ProductCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    description: str | None = None
    price: float = Field(..., ge=0)
    image_url: str | None = None
    category: str | None = Field(default=None, max_length=80)
    available: bool = True


class ProductUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    description: str | None = None
    price: float | None = Field(default=None, ge=0)
    image_url: str | None = None
    category: str | None = Field(default=None, max_length=80)
    available: bool | None = None


class ProductOut(BaseModel):
    id: uuid.UUID
    merchant_id: uuid.UUID
    name: str
    description: str | None
    price: float
    image_url: str | None
    category: str | None
    available: bool

    model_config = {"from_attributes": True}


# ---------- التاجر ----------
class MerchantCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=160)
    type: MerchantType = MerchantType.FOOD
    description: str | None = None
    logo_url: str | None = None
    open_hours: str | None = None
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class MerchantUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=160)
    type: MerchantType | None = None
    description: str | None = None
    logo_url: str | None = None
    open_hours: str | None = None
    is_open: bool | None = None
    lat: float | None = Field(default=None, ge=-90, le=90)
    lng: float | None = Field(default=None, ge=-180, le=180)


class MerchantOut(BaseModel):
    id: uuid.UUID
    name: str
    type: str  # نصّ حرّ (food/fresh/market) — متسامح مع أي قيمة لتجنّب أخطاء العرض
    description: str | None
    logo_url: str | None
    open_hours: str | None
    is_open: bool
    rating: float
    location: LocationOut | None = None
    distance_km: float | None = None


class MerchantDetail(MerchantOut):
    products: list[ProductOut] = []
