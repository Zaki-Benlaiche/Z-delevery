/** حسابات جغرافية بسيطة على العميل (تقدير المسافة/الوقت لتتبّع السائق) */
import type { Location } from "../api/types";

const R_KM = 6371;
const toRad = (d: number) => (d * Math.PI) / 180;

/** المسافة بالكيلومترات بين نقطتين (صيغة haversine) */
export function haversineKm(a: Location, b: Location): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** وقت وصول تقديري بالدقائق بافتراض سرعة حضرية وسطية للدرّاجة (~22 كم/س) */
export function etaMinutes(distanceKm: number, speedKmh = 22): number {
  return Math.max(1, Math.round((distanceKm / speedKmh) * 60));
}
