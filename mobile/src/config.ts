/** إعدادات وقت التشغيل — تتبدّل بحسب البيئة (dev/prod) */
import Constants from "expo-constants";

/**
 * عنوان الـ Backend.
 * - على المحاكي/الجهاز يجب أن يكون IP حقيقي (لا localhost)
 * - يمكن تجاوزه عبر متغيّر EXPO_PUBLIC_API_URL في .env
 */
const fallback = "http://10.0.2.2:8000"; // 10.0.2.2 = localhost الخاص بمحاكي Android

export const API_URL: string =
  process.env.EXPO_PUBLIC_API_URL ??
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  fallback;

/** عنوان WebSocket — نشتقّه من API_URL */
export const WS_URL: string = API_URL.replace(/^http/, "ws");
