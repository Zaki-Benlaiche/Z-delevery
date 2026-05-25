"""نقاط نهاية المصادقة عبر OTP"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import (
    SendOTPRequest,
    SendOTPResponse,
    TokenResponse,
    VerifyOTPRequest,
)
from app.services.otp import store_otp, verify_otp

router = APIRouter(prefix="/auth", tags=["المصادقة"])


@router.post("/send-otp", response_model=SendOTPResponse)
async def send_otp(payload: SendOTPRequest):
    """إرسال رمز تحقّق إلى رقم الهاتف"""
    code = await store_otp(payload.phone)
    return SendOTPResponse(
        message="تم إرسال رمز التحقّق",
        dev_otp=code if settings.otp_dev_mode else None,
    )


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp_and_login(payload: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    """التحقّق من الرمز وإنشاء الحساب (إن لم يوجد) وإصدار التوكنات"""
    if not await verify_otp(payload.phone, payload.code):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "رمز غير صحيح أو منتهي")

    result = await db.execute(select(User).where(User.phone == payload.phone))
    user = result.scalar_one_or_none()
    is_new = False

    if user is None:
        user = User(phone=payload.phone, name=payload.name, role=payload.role)
        db.add(user)
        await db.flush()
        is_new = True

    return TokenResponse(
        access_token=create_access_token(str(user.id), user.role.value),
        refresh_token=create_refresh_token(str(user.id), user.role.value),
        user_id=str(user.id),
        role=user.role,
        is_new_user=is_new,
    )
