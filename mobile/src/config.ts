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

/**
 * إعداد Cloudinary لرفع صور التجّار (شعار المحلّ + صور المنتجات).
 * cloudName + uploadPreset غير سرّيين (رفع unsigned يكشفهما في العميل أصلاً).
 * يُضبطان في app.json → extra.cloudinary أو عبر متغيّرات EXPO_PUBLIC_*.
 */
const cloudinaryExtra = Constants.expoConfig?.extra?.cloudinary as
  | { cloudName?: string; uploadPreset?: string }
  | undefined;

// نتجاهل القيم النائبة (placeholder) التي تبدأ بـ YOUR_ حتى لا تظهر أزرار الرفع بإعداد وهمي
const clean = (v: string | undefined) => (v && !v.startsWith("YOUR_") ? v : "");

export const CLOUDINARY = {
  cloudName: clean(process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD ?? cloudinaryExtra?.cloudName),
  uploadPreset: clean(process.env.EXPO_PUBLIC_CLOUDINARY_PRESET ?? cloudinaryExtra?.uploadPreset),
};

/** هل إعداد Cloudinary مكتمل؟ (نخفي أزرار الرفع إن لم يكن) */
export const CLOUDINARY_ENABLED = Boolean(CLOUDINARY.cloudName && CLOUDINARY.uploadPreset);

/**
 * مفتاح خرائط Google لأندرويد — يُضبط في app.json → android.config.googleMaps.apiKey.
 * إن كان نائباً (YOUR_...) أو غائباً نعتبر الخرائط غير مفعّلة، فنُظهر بطاقة وجهة بديلة
 * بدل خريطة سوداء معطوبة.
 */
const mapsKey = (Constants.expoConfig as { android?: { config?: { googleMaps?: { apiKey?: string } } } } | undefined)
  ?.android?.config?.googleMaps?.apiKey;

export const MAPS_ENABLED = Boolean(mapsKey && !mapsKey.startsWith("YOUR_"));
