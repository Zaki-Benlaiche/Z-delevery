import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { merchantsApi } from "../api/merchants";
import type { MerchantType } from "../api/types";
import { useAuth } from "../auth/context";
import { useMyMerchant } from "../hooks/useMyMerchant";
import { colors } from "../theme";

const CATEGORIES: { value: MerchantType; emoji: string; title: string; sub: string }[] = [
  { value: "food", emoji: "🍔", title: "Food", sub: "مطاعم ووجبات" },
  { value: "fresh", emoji: "🥬", title: "Fresh", sub: "لحوم وخضر وفواكه" },
  { value: "market", emoji: "🛒", title: "Market", sub: "مواد غذائية وبقالة" },
];

export function SetupPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  // لو كان لديك متجر مسبقاً → توجّه للوحة الإدارة مباشرة
  const mine = useMyMerchant();
  useEffect(() => {
    if (mine.data) navigate("/orders", { replace: true });
  }, [mine.data, navigate]);
  const [name, setName] = useState("");
  const [type, setType] = useState<MerchantType>("food");
  const [description, setDescription] = useState("");
  const [openHours, setOpenHours] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [manual, setManual] = useState(false);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: (loc: { lat: number; lng: number }) =>
      merchantsApi.create({
        name,
        type,
        description: description || null,
        open_hours: openHours || null,
        lat: loc.lat,
        lng: loc.lng,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["my-merchant"] });
      navigate("/orders", { replace: true }); // الانتقال للوحة الإدارة بعد الإنشاء
    },
    onError: (e) => setError((e as Error).message),
  });

  const useMyLocation = () => {
    setError(null);
    if (!navigator.geolocation) {
      setError("المتصفّح لا يدعم تحديد الموقع — أدخل الإحداثيات يدوياً");
      setManual(true);
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setManual(false);
        setLocating(false);
      },
      () => {
        setError("تعذّر تحديد الموقع — اسمح بالوصول أو أدخله يدوياً");
        setManual(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const resolvedCoords = (): { lat: number; lng: number } | null => {
    if (coords) return coords;
    if (manual) {
      const la = parseFloat(manualLat.replace(",", "."));
      const ln = parseFloat(manualLng.replace(",", "."));
      if (!Number.isNaN(la) && !Number.isNaN(ln)) return { lat: la, lng: ln };
    }
    return null;
  };

  const submit = () => {
    setError(null);
    if (!name.trim()) return setError("أدخل اسم المتجر");
    const loc = resolvedCoords();
    if (!loc) return setError("حدّد موقع المتجر أولاً");
    if (loc.lat < -90 || loc.lat > 90 || loc.lng < -180 || loc.lng > 180)
      return setError("إحداثيات غير صالحة");
    create.mutate(loc);
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <button onClick={signOut} style={styles.signOut}>تسجيل الخروج</button>

        <div style={styles.header}>
          <div style={styles.logo}>🛵</div>
          <h1 style={styles.title}>أنشئ متجرك</h1>
          <p style={styles.subtitle}>دقيقة واحدة وتبدأ باستقبال الطلبات</p>
        </div>

        {/* الاسم */}
        <label style={styles.label}>اسم المتجر</label>
        <input
          style={styles.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="مثال: سوبيريت عبود"
        />

        {/* التصنيف — بطاقات */}
        <label style={{ ...styles.label, marginTop: 18 }}>نوع المتجر</label>
        <div style={styles.catGrid}>
          {CATEGORIES.map((c) => {
            const active = type === c.value;
            return (
              <button
                key={c.value}
                onClick={() => setType(c.value)}
                style={{ ...styles.catCard, ...(active ? styles.catCardActive : {}) }}
              >
                <span style={styles.catEmoji}>{c.emoji}</span>
                <span style={{ ...styles.catTitle, color: active ? colors.primary : colors.text }}>{c.title}</span>
                <span style={styles.catSub}>{c.sub}</span>
              </button>
            );
          })}
        </div>

        {/* الوصف */}
        <label style={{ ...styles.label, marginTop: 18 }}>وصف مختصر <span style={styles.opt}>(اختياري)</span></label>
        <input
          style={styles.input}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="مثال: نوفّر لكم كل شيء طازجاً"
        />

        {/* أوقات العمل */}
        <label style={{ ...styles.label, marginTop: 18 }}>أوقات العمل <span style={styles.opt}>(اختياري)</span></label>
        <input
          style={styles.input}
          value={openHours}
          onChange={(e) => setOpenHours(e.target.value)}
          placeholder="مثال: 08:00 - 22:00"
        />

        {/* الموقع */}
        <label style={{ ...styles.label, marginTop: 18 }}>موقع المتجر</label>
        {coords ? (
          <div style={styles.locDone}>
            <span style={{ fontSize: 18 }}>✓</span>
            <span style={{ flex: 1 }}>تمّ تحديد موقعك بنجاح</span>
            <button onClick={() => setCoords(null)} style={styles.locChange}>تغيير</button>
          </div>
        ) : (
          <>
            <button onClick={useMyLocation} disabled={locating} style={styles.locBtn}>
              📍 {locating ? "...جارٍ تحديد موقعك" : "استخدم موقعي الحالي"}
            </button>
            {!manual ? (
              <button onClick={() => setManual(true)} style={styles.manualLink}>أو أدخل الإحداثيات يدوياً</button>
            ) : (
              <div style={styles.manualGrid}>
                <input style={styles.input} value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="خط العرض (lat) مثل 36.7538" inputMode="decimal" />
                <input style={styles.input} value={manualLng} onChange={(e) => setManualLng(e.target.value)} placeholder="خط الطول (lng) مثل 3.0588" inputMode="decimal" />
              </div>
            )}
          </>
        )}

        {error && <div style={styles.error}>{error}</div>}

        <button style={styles.submit} onClick={submit} disabled={create.isPending}>
          {create.isPending ? "...جارٍ الإنشاء" : "إنشاء المتجر"}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: { minHeight: "100vh", padding: 24, display: "grid", placeItems: "center", background: colors.surface },
  card: {
    position: "relative",
    width: "100%",
    maxWidth: 480,
    background: colors.bg,
    borderRadius: 24,
    padding: 32,
    boxShadow: "0 12px 40px rgba(15,23,42,0.10)",
  },
  signOut: {
    position: "absolute",
    top: 20,
    left: 20,
    background: "transparent",
    border: "none",
    color: colors.textFaint,
    fontSize: 13,
    cursor: "pointer",
  },
  header: { textAlign: "center", marginBottom: 24 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 22,
    background: colors.primary,
    display: "grid",
    placeItems: "center",
    fontSize: 38,
    margin: "0 auto 14px",
    boxShadow: "0 8px 20px rgba(255,107,26,0.35)",
  },
  title: { fontSize: 24, fontWeight: 800, color: colors.text, margin: 0 },
  subtitle: { fontSize: 14, color: colors.textMuted, marginTop: 4 },

  label: { display: "block", fontSize: 14, fontWeight: 700, color: colors.text, marginBottom: 8, textAlign: "right" },
  opt: { fontWeight: 400, color: colors.textFaint, fontSize: 12 },
  input: {
    width: "100%",
    boxSizing: "border-box",
    height: 50,
    borderRadius: 14,
    border: `1.5px solid ${colors.border}`,
    background: colors.surfaceAlt,
    padding: "0 16px",
    fontSize: 15,
    color: colors.text,
    textAlign: "right",
    outline: "none",
  },

  catGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  catCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    padding: "16px 8px",
    borderRadius: 16,
    border: `1.5px solid ${colors.border}`,
    background: colors.surfaceAlt,
    cursor: "pointer",
    transition: "all .15s",
  },
  catCardActive: { borderColor: colors.primary, background: colors.primarySoft },
  catEmoji: { fontSize: 28 },
  catTitle: { fontSize: 15, fontWeight: 800 },
  catSub: { fontSize: 11, color: colors.textMuted, textAlign: "center" },

  locBtn: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    border: `1.5px dashed ${colors.primary}`,
    background: colors.primarySoft,
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
  },
  manualLink: {
    display: "block",
    width: "100%",
    marginTop: 10,
    background: "transparent",
    border: "none",
    color: colors.textMuted,
    fontSize: 13,
    cursor: "pointer",
    textAlign: "center",
  },
  manualGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 },
  locDone: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    height: 50,
    padding: "0 16px",
    borderRadius: 14,
    background: colors.successSoft,
    color: colors.success,
    fontSize: 14,
    fontWeight: 700,
  },
  locChange: { background: "transparent", border: "none", color: colors.textMuted, fontSize: 13, cursor: "pointer", textDecoration: "underline" },

  error: {
    marginTop: 16,
    padding: "10px 14px",
    borderRadius: 12,
    background: colors.dangerSoft,
    color: colors.danger,
    fontSize: 14,
    textAlign: "center",
  },
  submit: {
    width: "100%",
    height: 54,
    marginTop: 24,
    borderRadius: 16,
    border: "none",
    background: colors.primary,
    color: "#fff",
    fontSize: 16,
    fontWeight: 800,
    cursor: "pointer",
    boxShadow: "0 8px 20px rgba(255,107,26,0.35)",
  },
};
