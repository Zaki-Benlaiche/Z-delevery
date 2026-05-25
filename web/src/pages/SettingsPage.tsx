import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { merchantsApi } from "../api/merchants";
import { useMyMerchant } from "../hooks/useMyMerchant";
import { colors } from "../theme";

export function SettingsPage() {
  const merchant = useMyMerchant();
  const queryClient = useQueryClient();

  const update = useMutation({
    mutationFn: (payload: { is_open?: boolean; open_hours?: string; description?: string }) =>
      merchantsApi.update(merchant.data!.id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-merchant"] }),
    onError: (e) => alert((e as Error).message),
  });

  const [openHours, setOpenHours] = useState("");
  const [description, setDescription] = useState("");

  if (merchant.isLoading || !merchant.data) return <div className="muted">...</div>;

  const m = merchant.data;
  const hours = openHours || m.open_hours || "";
  const desc = description || m.description || "";

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>إعدادات المتجر</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>الحالة</h2>
        <p className="muted" style={{ marginBottom: 12, fontSize: 13 }}>
          عند الإغلاق، لن يستطيع الزبائن إرسال طلبات جديدة.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ color: m.is_open ? colors.success : colors.textMuted, fontWeight: 700 }}>
            {m.is_open ? "🟢 مفتوح" : "⚫ مغلق"}
          </span>
          <button
            className={m.is_open ? "btn btn-secondary" : "btn btn-primary"}
            onClick={() => update.mutate({ is_open: !m.is_open })}
            disabled={update.isPending}
          >
            {m.is_open ? "إغلاق المتجر" : "فتح المتجر"}
          </button>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>المعلومات الأساسية</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className="field">
            <label>الاسم</label>
            <input className="input" value={m.name} disabled />
          </div>
          <div className="field">
            <label>الوصف</label>
            <input
              className="input"
              value={desc}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="field">
            <label>أوقات العمل</label>
            <input
              className="input"
              value={hours}
              onChange={(e) => setOpenHours(e.target.value)}
              placeholder="11:00 - 23:00"
            />
          </div>

          <button
            className="btn btn-primary"
            style={{ alignSelf: "flex-start" }}
            onClick={() =>
              update.mutate({
                open_hours: hours || undefined,
                description: desc || undefined,
              })
            }
            disabled={update.isPending}
          >
            {update.isPending ? "..." : "حفظ التغييرات"}
          </button>
        </div>
      </div>
    </div>
  );
}
