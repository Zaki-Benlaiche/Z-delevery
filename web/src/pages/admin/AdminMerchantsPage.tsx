import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { adminApi, type AdminMerchant } from "../../api/admin";
import { Modal } from "../../components/Modal";
import { useToast } from "../../components/Toast";
import { Icon } from "../../components/Icon";
import { colors } from "../../theme";

const TYPE_LABEL: Record<string, string> = { food: "مطاعم", fresh: "طازج", market: "بقالة", clinic: "عيادة" };
const dz = (n: number) => Number(n || 0).toLocaleString("fr-DZ");

export function AdminMerchantsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const toast = useToast();
  const merchants = useQuery({ queryKey: ["admin-merchants"], queryFn: adminApi.merchants });
  const [confirmDelete, setConfirmDelete] = useState<AdminMerchant | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");

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

  const all = merchants.data ?? [];
  const totals = useMemo(
    () => ({
      open: all.filter((m) => m.is_open).length,
      revenue: all.reduce((s, m) => s + (m.revenue || 0), 0),
      orders: all.reduce((s, m) => s + (m.orders_count || 0), 0),
    }),
    [all],
  );

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all
      .filter((m) => (filter === "open" ? m.is_open : filter === "closed" ? !m.is_open : true))
      .filter((m) => !q || m.name.toLowerCase().includes(q) || (m.owner_phone ?? "").includes(q));
  }, [all, search, filter]);

  return (
    <div>
      <header className="page-header">
        <div>
          <h1 className="page-title">المتاجر</h1>
          <p className="page-subtitle">{all.length} متجر · {dz(totals.orders)} طلب · {dz(totals.revenue)} دج إيراد</p>
        </div>
      </header>

      {/* بطاقات ملخّص */}
      <div style={styles.summary}>
        <SummaryStat label="إجمالي المتاجر" value={dz(all.length)} color={colors.primary} />
        <SummaryStat label="مفتوح الآن" value={dz(totals.open)} color={colors.success} />
        <SummaryStat label="إجمالي الطلبات" value={dz(totals.orders)} color={colors.info} />
        <SummaryStat label="إجمالي الإيراد" value={`${dz(totals.revenue)} دج`} color={colors.accent} />
      </div>

      {/* أدوات: بحث + فلتر */}
      <div style={styles.toolbar}>
        <div className="search-bar" style={{ flex: 1, minWidth: 220 }}>
          <input
            className="input"
            placeholder="ابحث باسم المتجر أو هاتف المالك…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={styles.segmented}>
          {(["all", "open", "closed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...styles.segBtn,
                ...(filter === f ? styles.segActive : {}),
              }}
            >
              {f === "all" ? "الكل" : f === "open" ? "مفتوح" : "مغلق"}
            </button>
          ))}
        </div>
      </div>

      {merchants.isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 76 }} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="muted" style={{ textAlign: "center", padding: 40 }}>لا متاجر مطابقة</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((m) => (
            <div key={m.id} className="card card-hover" style={styles.row} onClick={() => navigate(`/admin/merchants/${m.id}`)}>
              <div style={styles.avatar}>
                {m.logo_url ? (
                  <img src={m.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 12 }} />
                ) : (
                  <Icon name="store" size={20} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{m.name}</span>
                  <span className="pill" style={{ background: colors.surface, color: colors.textMuted, fontSize: 11 }}>
                    {TYPE_LABEL[m.type] ?? m.type}
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                  {m.owner_name || "—"} · {m.owner_phone || "بلا هاتف"} · ⭐ {Number(m.rating).toFixed(1)}
                </div>
              </div>

              <MiniMetric label="طلبات" value={dz(m.orders_count)} />
              <MiniMetric label="إيراد" value={`${dz(m.revenue)} دج`} />
              <MiniMetric label="منتجات" value={dz(m.products_count)} />

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

              <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
                <button className="btn btn-secondary btn-sm" onClick={() => toggle.mutate(m.id)} disabled={toggle.isPending}>
                  {m.is_open ? "إغلاق" : "فتح"}
                </button>
                <button className="btn btn-ghost btn-sm" style={{ color: colors.danger }} onClick={() => setConfirmDelete(m)}>
                  حذف
                </button>
              </div>
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

function SummaryStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{label}</div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: "center", minWidth: 70 }}>
      <div style={{ fontWeight: 800, fontSize: 14 }}>{value}</div>
      <div className="muted" style={{ fontSize: 11 }}>{label}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  summary: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  toolbar: { display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" },
  segmented: { display: "flex", background: colors.surface, borderRadius: 12, padding: 3, gap: 2 },
  segBtn: { padding: "8px 16px", borderRadius: 9, fontSize: 13, fontWeight: 600, color: colors.textMuted },
  segActive: { background: colors.bg, color: colors.text, boxShadow: "var(--shadow-sm)" },

  row: { display: "flex", gap: 14, alignItems: "center", cursor: "pointer" },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 12,
    background: colors.surface,
    display: "grid",
    placeItems: "center",
    color: colors.textMuted,
    flexShrink: 0,
  },
};
