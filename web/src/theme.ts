/** نظام التصميم الكامل للويب — موحّد مع تطبيق الموبايل */
export const colors = {
  primary: "#FF6B1A",
  primaryDark: "#E5530A",
  primarySoft: "#FFF1E6",
  accent: "#0A9396",

  // أسطح
  bg: "#FFFFFF",
  canvas: "#FAFAFA",
  surface: "#F4F4F5",
  surfaceAlt: "#F8F9FB",

  // نص
  text: "#0F172A",
  textMuted: "#64748B",
  textFaint: "#94A3B8",

  border: "#E2E8F0",
  borderSoft: "#EEF2F7",

  success: "#10B981",
  successSoft: "#ECFDF5",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  danger: "#EF4444",
  dangerSoft: "#FEF2F2",
  info: "#3B82F6",
  infoSoft: "#EFF6FF",

  status: {
    pending: "#94A3B8",
    accepted: "#3B82F6",
    preparing: "#F59E0B",
    ready: "#8B5CF6",
    picked_up: "#0EA5E9",
    on_the_way: "#0A9396",
    delivered: "#10B981",
    cancelled: "#EF4444",
  } as const,
};

/** خلفيات pill ناعمة لكل حالة (مع color الأمامي من colors.status) */
export const statusSoft: Record<string, string> = {
  pending: "#F1F5F9",
  accepted: "#EFF6FF",
  preparing: "#FEF3C7",
  ready: "#F5F3FF",
  picked_up: "#E0F2FE",
  on_the_way: "#ECFEFF",
  delivered: "#ECFDF5",
  cancelled: "#FEF2F2",
};

export const statusLabel: Record<string, string> = {
  pending: "بانتظار القبول",
  accepted: "مقبول",
  preparing: "قيد التحضير",
  ready: "جاهز للاستلام",
  picked_up: "استلمه السائق",
  on_the_way: "في الطريق",
  delivered: "سُلِّم",
  cancelled: "أُلغي",
};
