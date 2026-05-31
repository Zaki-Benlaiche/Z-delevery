"""مخططات العروض الترويجية"""
import uuid

from pydantic import BaseModel, Field


class OfferCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    subtitle: str | None = None
    image_url: str | None = Field(default=None, max_length=500)
    discount_pct: int | None = Field(default=None, ge=1, le=100)
    badge_text: str | None = Field(default=None, max_length=40)
    is_active: bool = True


class OfferUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=120)
    subtitle: str | None = None
    image_url: str | None = Field(default=None, max_length=500)
    discount_pct: int | None = Field(default=None, ge=1, le=100)
    badge_text: str | None = Field(default=None, max_length=40)
    is_active: bool | None = None


class OfferOut(BaseModel):
    id: uuid.UUID
    merchant_id: uuid.UUID
    title: str
    subtitle: str | None
    image_url: str | None
    discount_pct: int | None
    badge_text: str | None
    is_active: bool
    # اسم المتجر — يُملأ في الرواتر ليتمكّن الزبون من فتح المتجر مباشرةً
    merchant_name: str | None = None

    model_config = {"from_attributes": True}
