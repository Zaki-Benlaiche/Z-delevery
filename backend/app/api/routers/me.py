"""نقاط نهاية المستخدم الحالي (`/me/...`)"""
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.enums import UserRole
from app.models.user import User

router = APIRouter(prefix="/me", tags=["أنا"])


class ProfileOut(BaseModel):
    id: uuid.UUID
    name: str | None
    phone: str
    role: UserRole
    avatar_url: str | None


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=120)
    avatar_url: str | None = Field(default=None, max_length=500)


@router.get("/profile", response_model=ProfileOut)
async def get_profile(user: User = Depends(get_current_user)):
    """ملف المستخدم الحالي (اسم/هاتف/دور/صورة) لعرضه في شاشة الحساب."""
    return ProfileOut(id=user.id, name=user.name, phone=user.phone, role=user.role, avatar_url=user.avatar_url)


@router.patch("/profile", response_model=ProfileOut)
async def update_profile(
    payload: ProfileUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """تحديث الاسم و/أو صورة الملف الشخصي (الحقول المُرسَلة فقط)."""
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        user.name = data["name"].strip() or None
    if "avatar_url" in data:
        user.avatar_url = data["avatar_url"]
    await db.flush()
    return ProfileOut(id=user.id, name=user.name, phone=user.phone, role=user.role, avatar_url=user.avatar_url)


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
