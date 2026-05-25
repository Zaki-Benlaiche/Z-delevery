"""خدمة رموز التحقّق (OTP) — تُخزَّن في Redis مع مهلة انتهاء"""
import random

import redis.asyncio as aioredis

from app.core.config import settings

_redis: aioredis.Redis | None = None


def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


def _key(phone: str) -> str:
    return f"otp:{phone}"


def generate_code() -> str:
    return f"{random.randint(1000, 9999)}"


async def store_otp(phone: str) -> str:
    """يولّد رمزاً ويخزّنه في Redis ويُعيده (للإرسال أو لوضع التطوير)"""
    code = generate_code()
    await get_redis().set(_key(phone), code, ex=settings.otp_expire_seconds)
    # TODO: في الإنتاج، أرسل الرمز عبر مزوّد SMS هنا
    return code


async def verify_otp(phone: str, code: str) -> bool:
    stored = await get_redis().get(_key(phone))
    if stored is not None and stored == code:
        await get_redis().delete(_key(phone))
        return True
    return False
