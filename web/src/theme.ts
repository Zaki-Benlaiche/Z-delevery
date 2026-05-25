/** ألوان موحّدة مع تطبيق الموبايل */
export const colors = {
  primary: "#E85D04",
  primaryDark: "#B84A00",
  accent: "#0A9396",
  bg: "#FFFFFF",
  surface: "#F7F7F9",
  text: "#1A1A1A",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  status: {
    pending: "#9CA3AF",
    accepted: "#3B82F6",
    preparing: "#F59E0B",
    ready: "#8B5CF6",
    picked_up: "#0EA5E9",
    on_the_way: "#0A9396",
    delivered: "#10B981",
    cancelled: "#EF4444",
  } as const,
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
