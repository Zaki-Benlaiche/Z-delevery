/** عنوان الـ Backend — يقبل التجاوز عبر متغيّر VITE_API_URL */
export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/**
 * إعداد Cloudinary لرفع صور التجّار (شعار المحلّ + صور المنتجات).
 * cloudName + uploadPreset غير سرّيين (رفع unsigned يكشفهما العميل أصلاً)،
 * لذا نضع القيم الفعليّة كقيمة افتراضية حتى يعمل الرفع دون إعداد إضافي.
 * يمكن تجاوزها عبر VITE_CLOUDINARY_CLOUD / VITE_CLOUDINARY_PRESET.
 */
export const CLOUDINARY = {
  cloudName: (import.meta.env.VITE_CLOUDINARY_CLOUD as string | undefined) ?? "dgebiyxv3",
  uploadPreset: (import.meta.env.VITE_CLOUDINARY_PRESET as string | undefined) ?? "ml_default",
};

/** هل إعداد Cloudinary مكتمل؟ (نخفي أزرار الرفع إن لم يكن) */
export const CLOUDINARY_ENABLED = Boolean(CLOUDINARY.cloudName && CLOUDINARY.uploadPreset);
