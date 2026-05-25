"""مخططات عناوين المستخدم"""
import uuid

from pydantic import BaseModel, Field

from app.schemas.common import LocationOut


class AddressCreate(BaseModel):
    label: str = Field(default="المنزل", max_length=60)
    details: str | None = Field(default=None, max_length=255)
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class AddressOut(BaseModel):
    id: uuid.UUID
    label: str
    details: str | None
    location: LocationOut | None = None
