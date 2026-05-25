"""خدمة رموز التحقّق (OTP).

في بيئات الإنتاج المُدفوعة (Railway/upstash) نستخدم Redis. في النشر المجاني
(Render، Fly free) قد لا يتوفّر Redis — في هذه الحالة نقع على مخزن داخل
الذاكرة بنفس واجهة الـ API. مناسب لـ MVP بحركة OTP محدودة (~عشرات في الثانية).
"""
import random
import time
from typing import Protocol

import redis.asyncio as aioredis

from app.core.config import settings


class _AsyncKV(Protocol):
    async def set(self, key: str, value: str, ex: int) -> object: ...
    async def get(self, key: str) -> str | None: ...
    async def delete(self, key: str) -> object: ...


class _MemoryStore:
    """واجهة في الذاكرة تحاكي ما نستخدمه من Redis (set/get/delete مع TTL).

    ملاحظات:
    - عند إعادة تشغيل الخادم تُمسح كل الرموز (مقبول لـ OTP — يطلب المستخدم رمزاً جديداً)
    - في نشر متعدّد العمليات/الخوادم سيصير لكل عملية مخزنها — استخدم Redis حينئذٍ
    """
    def __init__(self) -> None:
        self._data: dict[str, tuple[str, float]] = {}

    async def set(self, key: str, value: str, ex: int) -> None:
        self._data[key] = (value, time.time() + ex)

    async def get(self, key: str) -> str | None:
        item = self._data.get(key)
        if item is None:
            return None
        value, expires_at = item
        if time.time() > expires_at:
            self._data.pop(key, None)
            return None
        return value

    async def delete(self, key: str) -> None:
        self._data.pop(key, None)


_store: _AsyncKV | None = None


def get_store() -> _AsyncKV:
    """يُعيد مخزن OTP المناسب للبيئة: Redis إن توفّر، وإلا في الذاكرة."""
    global _store
    if _store is None:
        url = settings.redis_url
        # القيمة الخاصّة "memory://" تجبر استخدام المخزن الداخلي صراحةً
        if not url or url == "memory://" or url.strip() == "":
            _store = _MemoryStore()
        else:
            _store = aioredis.from_url(url, decode_responses=True)
    return _store


def _key(phone: str) -> str:
    return f"otp:{phone}"


def generate_code() -> str:
    return f"{random.randint(1000, 9999)}"


async def store_otp(phone: str) -> str:
    """يولّد رمزاً ويخزّنه مع مهلة انتهاء ويُعيده (للإرسال أو لوضع التطوير)."""
    code = generate_code()
    await get_store().set(_key(phone), code, ex=settings.otp_expire_seconds)
    # TODO: في الإنتاج، أرسل الرمز عبر مزوّد SMS هنا
    return code


async def verify_otp(phone: str, code: str) -> bool:
    stored = await get_store().get(_key(phone))
    if stored is not None and stored == code:
        await get_store().delete(_key(phone))
        return True
    return False
