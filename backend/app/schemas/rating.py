"""مخططات تقييم الطلب"""
import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class RatingCreate(BaseModel):
    stars: int = Field(..., ge=1, le=5)
    comment: str | None = Field(default=None, max_length=500)


class RatingOut(BaseModel):
    id: uuid.UUID
    order_id: uuid.UUID
    merchant_id: uuid.UUID
    stars: int
    comment: str | None
    created_at: datetime
