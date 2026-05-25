/** Hook لاشتراك WebSocket في غرفة تتبّع طلب */
import { useEffect, useRef, useState } from "react";

import { WS_URL } from "../config";
import { tokenStorage } from "../auth/storage";
import type { Location, OrderStatus, TrackingMessage } from "../api/types";

export interface OrderTrackingState {
  connected: boolean;
  status: OrderStatus | null;       // آخر حالة وردت من البثّ
  driverLocation: Location | null;  // آخر موقع للسائق
}

export function useOrderTracking(orderId: string): OrderTrackingState {
  const [state, setState] = useState<OrderTrackingState>({
    connected: false,
    status: null,
    driverLocation: null,
  });
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      if (cancelled) return;
      const token = await tokenStorage.getAccess();
      if (!token) return;

      const ws = new WebSocket(`${WS_URL}/api/ws/orders/${orderId}?token=${token}`);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!cancelled) setState((s) => ({ ...s, connected: true }));
      };

      ws.onmessage = (e) => {
        try {
          const msg: TrackingMessage = JSON.parse(String(e.data));
          if (msg.type === "status") {
            setState((s) => ({
              ...s,
              status: msg.status,
              driverLocation: msg.location ?? s.driverLocation,
            }));
          } else if (msg.type === "driver_location") {
            setState((s) => ({
              ...s,
              driverLocation: { lat: msg.lat, lng: msg.lng },
            }));
          }
        } catch {
          // نتجاهل الرسائل غير الصالحة
        }
      };

      ws.onclose = () => {
        if (cancelled) return;
        setState((s) => ({ ...s, connected: false }));
        // إعادة محاولة بعد 3 ثوانٍ — مفيد عند فقدان الشبكة لحظياً
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => ws.close();
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [orderId]);

  return state;
}
