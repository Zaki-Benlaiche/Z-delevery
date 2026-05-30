/** نظام التصميم الكامل — ألوان + مسافات + خطوط + ظلال + زوايا */
import { Platform } from "react-native";

export const colors = {
  // أساسي
  primary: "#FF6B1A",        // برتقالي أكثر حيويّة (الطعام/التوصيل)
  primaryDark: "#E5530A",
  primarySoft: "#FFF1E6",    // خلفية تظليل بسيطة
  accent: "#0A9396",

  // أسطح
  background: "#FFFFFF",     // البطاقات والعناصر المرتفعة
  canvas: "#FAFAFA",         // خلفية الصفحة
  surface: "#F4F4F5",        // chips وحقول البحث
  surfaceAlt: "#F8F9FB",

  // نص
  text: "#0F172A",           // slate-900
  textMuted: "#64748B",      // slate-500
  textFaint: "#94A3B8",      // slate-400

  // حدود
  border: "#E2E8F0",         // slate-200
  borderSoft: "#EEF2F7",
  divider: "#F1F5F9",

  // حالة
  success: "#10B981",
  successSoft: "#ECFDF5",
  warning: "#F59E0B",
  warningSoft: "#FEF3C7",
  danger: "#EF4444",
  dangerSoft: "#FEF2F2",
  info: "#3B82F6",
  infoSoft: "#EFF6FF",

  // حالات الطلب
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

/** مسافات على شبكة 4-نقاط */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

/** نصف أقطار الزوايا */
export const radii = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
};

/** أوزان الخطوط — تتجنّب iOS variant issue */
export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
};

/** مقاسات الخطوط الموحّدة */
export const fontSize = {
  caption: 11,
  small: 13,
  body: 15,
  bodyLg: 16,
  h4: 17,
  h3: 19,
  h2: 22,
  h1: 26,
  display: 32,
};

/** الظلال — متعدّدة المنصّات (iOS shadow + Android elevation) */
export const shadows = {
  none: {},
  sm: Platform.select({
    ios: { shadowColor: "#0F172A", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
    android: { elevation: 1 },
    default: {},
  })!,
  md: Platform.select({
    ios: { shadowColor: "#0F172A", shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
    android: { elevation: 3 },
    default: {},
  })!,
  lg: Platform.select({
    ios: { shadowColor: "#0F172A", shadowOpacity: 0.12, shadowRadius: 28, shadowOffset: { width: 0, height: 12 } },
    android: { elevation: 8 },
    default: {},
  })!,
  // ظلّ ملوّن للعناصر البرتقالية البارزة (CTA رئيسي)
  primary: Platform.select({
    ios: { shadowColor: "#FF6B1A", shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
    android: { elevation: 6 },
    default: {},
  })!,
};
