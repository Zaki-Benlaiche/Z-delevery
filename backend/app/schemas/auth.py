"""مخططات (schemas) المصادقة"""
from pydantic import BaseModel, Field

from app.models.enums import UserRole


class SendOTPRequest(BaseModel):
    phone: str = Field(..., min_length=6, max_length=20, examples=["0555123456"])


class SendOTPResponse(BaseModel):
    message: str
    # في وضع التطوير فقط نُرجع الرمز لتسهيل الاختبار
    dev_otp: str | None = None


class VerifyOTPRequest(BaseModel):
    phone: str = Field(..., examples=["0555123456"])
    code: str = Field(..., min_length=4, max_length=6, examples=["1234"])
    name: str | None = Field(default=None, examples=["زكريا"])
    role: UserRole = UserRole.CUSTOMER


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user_id: str
    role: UserRole
    is_new_user: bool = False
