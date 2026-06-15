import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { merchantsApi } from "../api/merchants";
import type { MerchantType } from "../api/types";
import { colors } from "../theme";

export function SetupPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [type, setType] = useState<MerchantType>("food");
  const [description, setDescription] = useState("");
  const [openHours, setOpenHours] = useState("");
  const [lat, setLat] = useState("36.7538");
  const [lng, setLng] = useState("3.0588");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      merchantsApi.create({
        name,
        type,
        description: description || null,
        open_hours: openHours || null,
        lat: parseFloat(lat),
        lng: parseFloat(lng),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-merchant"] }),
    onError: (e) => setError((e as Error).message),
  });

  const submit = () => {
    setError(null);
    if (!name.trim()) return setError("أدخل اسم المتجر");
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (Number.isNaN(la) || Number.isNaN(ln))
      return setError("إحداثيات غير صالحة");
    create.mutate();
  };

  return (
    <div style={styles.wrap}>
      <div className="card" style={styles.card}>
        <h1 style={styles.title}>إعداد متجرك</h1>
        <p className="muted">هذه المعلومات يراها الزبائن في التطبيق</p>

        <div style={styles.grid}>
          <div className="field">
            <label>اسم المتجر *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="field">
            <label>النوع</label>
            <select
              className="input"
              value={type}
              onChange={(e) => setType(e.target.value as MerchantType)}
            >
              <option value="food">🍔 مطاعم (Food)</option>
              <option value="fresh">🥬 لحوم وخضر وفواكه (Fresh)</option>
              <option value="market">🛒 مواد غذائية (Market)</option>
            </select>
          </div>

          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>وصف مختصر</label>
            <input
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: أفضل بيتزا بفرن الحطب"
            />
          </div>

          <div className="field">
            <label>أوقات العمل</label>
            <input
              className="input"
              value={openHours}
              onChange={(e) => setOpenHours(e.target.value)}
              placeholder="مثال: 11:00 - 23:00"
            />
          </div>

          <div className="field">
            <label>خط العرض (lat)</label>
            <input
              className="input"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              type="number"
              step="0.0001"
            />
          </div>

          <div className="field">
            <label>خط الطول (lng)</label>
            <input
              className="input"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              type="number"
              step="0.0001"
            />
          </div>
        </div>

        <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
          تلميح: افتح Google Maps، انقر على موقعك بزر يمين الفأرة، وانسخ الإحداثيات.
        </p>

        {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}

        <button
          className="btn btn-primary"
          style={{ marginTop: 20, minWidth: 160 }}
          onClick={submit}
          disabled={create.isPending}
        >
          {create.isPending ? "..." : "إنشاء المتجر"}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    minHeight: "100vh",
    padding: 24,
    display: "grid",
    placeItems: "center",
    background: colors.surface,
  },
  card: { width: "100%", maxWidth: 720 },
  title: { fontSize: 22, fontWeight: 800 },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginTop: 16,
  },
};
