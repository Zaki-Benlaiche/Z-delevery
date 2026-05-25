/** يبثّ موقع السائق إلى الـ Backend بشكل دوري عندما يكون متّصلاً.
 *
 * في MVP نستخدم foreground فقط (التطبيق مفتوح). دعم الخلفية يحتاج
 * expo-task-manager + background fetch ويُترَك لمرحلة لاحقة.
 */
import { useEffect } from "react";
import * as Location from "expo-location";

import { driversApi } from "../api/drivers";

const INTERVAL_MS = 20_000;

export function useDriverLocationSender(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status !== "granted") return;
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        await driversApi.updateLocation(pos.coords.latitude, pos.coords.longitude);
      } catch {
        // لا نُعطّل الدورة بسبب فشل لحظي — سنُحاول مجدّداً في التيك التالي
      }
    };

    // تيك أوّل فوري لتقليص زمن أوّل ظهور للموقع لدى الزبون
    tick();
    const id = setInterval(tick, INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [active]);
}
