"""خدمة الإشعارات — تبثّ عبر Expo Push API.

تصميم:
- لا نمنع تنفيذ الـ API إذا فشل الإرسال؛ نُسجّل الخطأ ونمضي
- نستخدم asyncio.create_task لإرسال الـ push بالتوازي مع الاستجابة
- الـ Expo Push API بسيط: HTTP POST واحد لكلّ تنبيه أو دفعة (max 100)

المرجع: https://docs.expo.dev/push-notifications/sending-notifications/
"""
import asyncio
import logging
from typing import Any

import httpx

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
logger = logging.getLogger(__name__)


async def send_push(
    token: str,
    title: str,
    body: str,
    *,
    data: dict[str, Any] | None = None,
) -> None:
    """يرسل إشعار push واحداً عبر Expo. يتجاهل الفشل بصمت (مع log)."""
    if not token or not token.startswith(("ExponentPushToken[", "ExpoPushToken[")):
        return  # توكن غير صالح
    payload = {
        "to": token,
        "title": title,
        "body": body,
        "sound": "default",
        "priority": "high",
    }
    if data:
        payload["data"] = data
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            await client.post(EXPO_PUSH_URL, json=payload)
    except Exception as e:  # noqa: BLE001
        logger.warning("Expo push failed: %s", e)


def fire_and_forget(coro) -> None:
    """يطلق coroutine بدون انتظار — للاستخدام داخل route handlers."""
    asyncio.create_task(coro)
