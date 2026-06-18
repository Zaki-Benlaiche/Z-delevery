import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { adminApi, type AdminMerchant } from "../../api/admin";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { colors } from "../../theme";

const TYPE_LABEL: Record<string, string> = { food: "مطاعم", fresh: "طازج", market: "بقالة" };

export function AdminMerchantsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const merchants = useQuery({ queryKey: ["admin-merchants"], queryFn: adminApi.merchants });
  const [confirmDelete, setConfirmDelete] = useState<AdminMerchant | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-merchants"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const toggle = useMutation({
    mutationFn: (id: string) => adminApi.toggleMerchant(id),
    onSuccess: () => invalidate(),
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteMerchant(id),
    onSuccess: () => {
      invalidate();
      toast.success("تم حذف المتجر");
      setConfirmDelete(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const rows = merchants.data ?? [];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>المتاجر ({rows.length})</h1>

      {merchants.isLoading ? (
        <div className="muted">...جاري التحميل</div>
      ) : rows.length === 0 ? (
        <div className="muted" style={{ textAlign: "center", padding: 40 }}>لا متاجر بعد</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((m) => (
            <div key={m.id} className="card" style={styles.row}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {TYPE_LABEL[m.type] ?? m.type} · ⭐ {Number(m.rating).toFixed(1)}
                </div>
              </div>
              <span
                className="pill"
                style={{
                  background: m.is_open ? colors.successSoft : colors.surface,
                  color: m.is_open ? colors.success : colors.textMuted,
                  fontSize: 12,
                }}
              >
                {m.is_open ? "مفتوح" : "مغلق"}
              </span>
              <button
                className="btn btn-secondary"
                onClick={() => toggle.mutate(m.id)}
                disabled={toggle.isPending}
              >
                {m.is_open ? "إغلاق" : "فتح"}
              </button>
              <button
                className="btn btn-ghost"
                style={{ color: colors.danger }}
                onClick={() => setConfirmDelete(m)}
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="حذف المتجر"
        width={420}
        footer={
          <>
            <button
              className="btn btn-primary"
              style={{ flex: 1, background: colors.danger }}
              onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}
              disabled={remove.isPending}
            >
              {remove.isPending ? "..." : "حذف نهائي"}
            </button>
            <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
              إلغاء
            </button>
          </>
        }
      >
        <p style={{ color: "var(--text-muted)" }}>
          حذف <b style={{ color: "var(--text)" }}>{confirmDelete?.name}</b> وكلّ منتجاته. لا يمكن التراجع.
        </p>
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: "flex", gap: 12, alignItems: "center" },
};
