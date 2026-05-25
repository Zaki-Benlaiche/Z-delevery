/** ألوان التطبيق — هوية بصرية واحدة عبر كل الشاشات */
export const colors = {
  primary: "#E85D04",      // برتقالي — يستحضر الطعام والطاقة
  primaryDark: "#B84A00",
  accent: "#0A9396",
  background: "#FFFFFF",
  surface: "#F7F7F9",
  text: "#1A1A1A",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  // تعيين ألوان حالات الطلب
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
