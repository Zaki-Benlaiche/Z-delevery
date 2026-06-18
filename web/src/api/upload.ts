/** رفع الصور إلى Cloudinary (رفع unsigned مباشر من المتصفّح — لا يمرّ عبر خادمنا) */
import { CLOUDINARY } from "../config";

/**
 * يرفع ملفّ صورة (من <input type="file">) إلى Cloudinary ويُعيد رابطه الآمن (secure_url).
 * البايتات تذهب مباشرةً إلى Cloudinary، فلا عبء على خادم الـ backend.
 */
export async function uploadToCloudinary(file: File, folder = "zdelivry"): Promise<string> {
  if (!CLOUDINARY.cloudName || !CLOUDINARY.uploadPreset) {
    throw new Error("إعداد رفع الصور غير مكتمل");
  }

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY.uploadPreset);
  form.append("folder", folder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`,
    { method: "POST", body: form },
  );

  if (!res.ok) {
    throw new Error(`تعذّر رفع الصورة (${res.status})`);
  }

  const json = (await res.json()) as { secure_url?: string };
  if (!json.secure_url) throw new Error("استجابة رفع غير صالحة");
  return json.secure_url;
}

/**
 * يحوّل رابط Cloudinary إلى نسخة مصغّرة محسّنة بإدراج معاملات التحويل بعد `/upload/`:
 * c_fill (قصّ للملء) + q_auto (ضغط ذكي) + f_auto (أفضل صيغة). غير التابع لـ Cloudinary يُعاد كما هو.
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
