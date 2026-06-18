/** حقل رفع صورة للويب — يختار ملفّاً، يرفعه إلى Cloudinary، يعرض المعاينة */
import { useRef, useState } from "react";

import { uploadToCloudinary, cloudinaryThumb } from "../api/upload";
import { useToast } from "./Toast";
import { colors } from "../theme";

interface Props {
  value: string | null | undefined;
  onChange: (url: string) => void;
  label?: string;
  shape?: "circle" | "rounded";
  size?: number;
  folder?: string;
}

export function ImageUpload({
  value,
  onChange,
  label = "أضف صورة",
  shape = "rounded",
  size = 96,
  folder = "zdelivry",
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();
  const [uploading, setUploading] = useState(false);
  const radius = shape === "circle" ? "50%" : 14;
  const preview = cloudinaryThumb(value, { w: Math.round(size * 2) });

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // نسمح بإعادة اختيار نفس الملفّ لاحقاً
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("اختر ملفّ صورة");
      return;
    }
    try {
      setUploading(true);
      const url = await uploadToCloudinary(file, folder);
      onChange(url);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        style={{
          position: "relative",
          width: size,
          height: size,
          borderRadius: radius,
          border: `1.5px dashed ${colors.border}`,
          background: colors.surface,
          padding: 0,
          cursor: uploading ? "default" : "pointer",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {preview ? (
          <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <span style={{ fontSize: size * 0.32, color: colors.textMuted }}>📷</span>
        )}

        {uploading ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(15,23,42,0.45)",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            ...جاري الرفع
          </div>
        ) : (
          <span
            style={{
              position: "absolute",
              bottom: 4,
              insetInlineEnd: 4,
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: colors.primary,
              color: "#fff",
              border: `2px solid ${colors.bg}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            }}
          >
            {value ? "✏️" : "+"}
          </span>
        )}
      </button>
      {label ? <span style={{ fontSize: 12, color: colors.textMuted, fontWeight: 600 }}>{label}</span> : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={onFile}
        style={{ display: "none" }}
      />
    </div>
  );
}
