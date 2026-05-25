"""نقاط نهاية المستخدم الحالي (`/me/...`)"""
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User

router = APIRouter(prefix="/me", tags=["أنا"])


class PushTokenIn(BaseModel):
    token: str = Field(..., max_length=255, examples=["ExponentPushToken[xxxx]"])


@router.post("/push-token")
async def register_push_token(
    payload: PushTokenIn,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """يسجّل توكن Expo Push للمستخدم — يُستدعى بعد منح الإذن في الموبايل."""
    user.expo_push_token = payload.token
    await db.flush()
    return {"ok": True}


@router.delete("/push-token")
async def clear_push_token(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """يلغي توكن الـ push عند تسجيل الخروج أو إلغاء الإذن."""
    user.expo_push_token = None
    await db.flush()
    return {"ok": True}
