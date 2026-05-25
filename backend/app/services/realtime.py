"""مدير اتصالات WebSocket للتتبّع اللحظي للطلبات.

نموذج بسيط في الذاكرة يكفي لـ MVP على خادم واحد. عند التوسّع لعدّة خوادم
يُستبدَل بنشر/اشتراك عبر Redis Pub/Sub.
"""
from collections import defaultdict

from fastapi import WebSocket


class ConnectionManager:
    def __init__(self) -> None:
        # لكل طلب: مجموعة الاتصالات المشتركة في تتبّعه
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, order_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self._rooms[order_id].add(ws)

    def disconnect(self, order_id: str, ws: WebSocket) -> None:
        room = self._rooms.get(order_id)
        if not room:
            return
        room.discard(ws)
        if not room:
            self._rooms.pop(order_id, None)

    async def broadcast(self, order_id: str, message: dict) -> None:
        """يبثّ رسالة لكل المشتركين في تتبّع طلب معيّن."""
        dead: list[WebSocket] = []
        for ws in self._rooms.get(order_id, set()):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(order_id, ws)


manager = ConnectionManager()
