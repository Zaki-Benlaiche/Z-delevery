"""تتبّع لحظي للطلب عبر WebSocket.

الزبون (أو التاجر/السائق المعنيّ) يفتح اتصالاً على طلب معيّن فيستقبل تحديثات
الحالة وموقع السائق فور حدوثها. التوكن يُمرَّر كـ query param لأن متصفّحات
الويب لا تسمح بترويسات مخصّصة عند فتح WebSocket.
"""
import uuid

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.core.security import decode_token
from app.models.driver import Driver
from app.models.enums import UserRole
from app.models.merchant import Merchant
from app.models.order import Order
from app.models.user import User
from app.services.realtime import manager

router = APIRouter(tags=["التتبّع"])

# رموز الإغلاق وفق معيار WebSocket
_WS_POLICY_VIOLATION = 1008


async def _authorize(order_id: uuid.UUID, token: str) -> bool:
    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        return False
    async with AsyncSessionLocal() as db:
        user = await db.get(User, uuid.UUID(payload["sub"]))
        order = await db.get(Order, order_id)
        if user is None or order is None:
            return False
        if user.role == UserRole.ADMIN or order.customer_id == user.id:
            return True
        if user.role == UserRole.MERCHANT:
            m_id = (
                await db.execute(select(Merchant.id).where(Merchant.user_id == user.id))
            ).scalar_one_or_none()
            return m_id is not None and order.merchant_id == m_id
        if user.role == UserRole.DRIVER:
            d_id = (
                await db.execute(select(Driver.id).where(Driver.user_id == user.id))
            ).scalar_one_or_none()
            return d_id is not None and order.driver_id == d_id
    return False


@router.websocket("/ws/orders/{order_id}")
async def track_order(
    websocket: WebSocket,
    order_id: uuid.UUID,
    token: str = Query(...),
):
    if not await _authorize(order_id, token):
        await websocket.close(code=_WS_POLICY_VIOLATION)
        return

    room = str(order_id)
    await manager.connect(room, websocket)
    try:
        await websocket.send_json({"type": "connected", "order_id": room})
        # نُبقي الاتصال مفتوحاً؛ أي رسائل واردة من العميل تُتجاهَل (نبضات حياة)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(room, websocket)
    except Exception:
        manager.disconnect(room, websocket)
