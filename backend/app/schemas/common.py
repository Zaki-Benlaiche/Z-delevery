"""مخططات مشتركة"""
from pydantic import BaseModel, Field


class LocationIn(BaseModel):
    lat: float = Field(..., ge=-90, le=90, examples=[36.7538])
    lng: float = Field(..., ge=-180, le=180, examples=[3.0588])


class LocationOut(BaseModel):
    lat: float
    lng: float
