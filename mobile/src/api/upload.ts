/** رفع الصور إلى Cloudinary (رفع unsigned مباشر من الجهاز — لا يمرّ عبر خادمنا) */
import { CLOUDINARY } from "../config";

/**
 * يرفع صورة محلّية (file:// من منتقي الصور) إلى Cloudinary ويُعيد رابطها الآمن (secure_url).
 * البايتات تذهب مباشرةً إلى Cloudinary، فلا عبء على خادم الـ backend.
 */
export async function uploadToCloudinary(localUri: string, folder = "zdelivry"): Promise<string> {
  if (!CLOUDINARY.cloudName || !CLOUDINARY.uploadPreset) {
    throw new Error("إعداد رفع الصور غير مكتمل");
  }

  const form = new FormData();
  // كائن {uri,type,name} هو جزء الملفّ الخاصّ بشبكة React Native (يدعمه XHR).
  // ملاحظة: fetch العامّ في Expo الحديث يرفضه ("unsupported FormDataPart")، لذا نستخدم XMLHttpRequest.
  form.append("file", { uri: localUri, type: "image/jpeg", name: "upload.jpg" } as unknown as Blob);
  form.append("upload_preset", CLOUDINARY.uploadPreset);
  form.append("folder", folder);

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`;

  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const json = JSON.parse(xhr.responseText) as { secure_url?: string };
          if (json.secure_url) resolve(json.secure_url);
          else reject(new Error("استجابة رفع غير صالحة"));
        } catch {
          reject(new Error("استجابة رفع غير صالحة"));
        }
      } else {
        reject(new Error(`تعذّر رفع الصورة (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("فشل الاتّصال بخادم الصور"));
    xhr.send(form);
  });
}

/**
 * يحوّل رابط Cloudinary إلى نسخة مصغّرة محسّنة بإدراج معاملات التحويل بعد `/upload/`:
 * - c_fill: ملء القصّ للأبعاد المطلوبة
 * - q_auto: ضغط ذكي تلقائي
 * - f_auto: أفضل صيغة للجهاز (WebP/AVIF)
 * الروابط غير التابعة لـ Cloudinary تُعاد كما هي.
 */
export function cloudinaryThumb(
  url: string | null | undefined,
  opts: { w: number; h?: number } = { w: 400 },
): string | null {
  if (!url) return null;
  const marker = "/upload/";
  const i = url.indexOf(marker);
  if (i === -1) return url;
  const t = `c_fill,w_${opts.w}${opts.h ? `,h_${opts.h}` : ""},q_auto,f_auto`;
  return url.slice(0, i + marker.length) + t + "/" + url.slice(i + marker.length);
}
