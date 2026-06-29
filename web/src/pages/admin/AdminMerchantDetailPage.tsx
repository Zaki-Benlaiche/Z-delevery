import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { adminApi } from "../../api/admin";
import type { OrderStatus } from "../../api/types";
import { Donut } from "../../components/charts";
import { Icon } from "../../components/Icon";
import { StatusBadge } from "../../components/StatusBadge";
import { colors, statusLabel } from "../../theme";

const TYPE_LABEL: Record<string, string> = { food: "مطاعم", fresh: "طازج", market: "بقالة", clinic: "عيادة" };
const dz = (n: number) => Number(n || 0).toLocaleString("fr-DZ");

const STATUS_ORDER: OrderStatus[] = [
  "pending", "accepted", "preparing", "ready", "picked_up", "on_the_way", "delivered", "cancelled",
];

export function AdminMerchantDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: ["admin-merchant", id], queryFn: () => adminApi.merchant(id), enabled: !!id });

  if (q.isLoading) return <div className="skeleton" style={{ height: 400 }} />;
  if (q.isError || !q.data)
    return <div className="error" style={{ padding: 24 }}>تعذّر تحميل المتجر</div>;

  const m = q.data;
  const segments = STATUS_ORDER.map((st) => ({
    value: m.by_status?.[st] ?? 0,
    color: colors.status[st],
    label: statusLabel[st],
  })).filter((s) => s.value > 0);

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate("/admin/merchants")} style={{ marginBottom: 14 }}>
        ← عودة للمتاجر
      </button>

      {/* رأس البطاقة */}
      <div className="card" style={styles.hero}>
        <div style={styles.logo}>
          {m.logo_url ? (
            <img src={m.logo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 16 }} />
          ) : (
            <Icon name="store" size={30} />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>{m.name}</h1>
            <span className="pill" style={{ background: colors.surface, color: colors.textMuted }}>
              {TYPE_LABEL[m.type] ?? m.type}
            </span>
            <span
              className="pill"
              style={{
                background: m.is_open ? colors.successSoft : colors.surface,
                color: m.is_open ? colors.success : colors.textMuted,
              }}
            >
              {m.is_open ? "مفتوح" : "مغلق"}
            </span>
          </div>
          <div className="muted" style={{ fontSize: 13, marginTop: 6 }}>
            {m.description || "بلا وصف"}
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 10, flexWrap: "wrap", fontSize: 13 }}>
            <Field icon="users" text={m.owner?.name || "—"} />
            <Field icon="bell" text={m.owner?.phone || "بلا هاتف"} />
            <Field icon="clock" text={m.open_hours || "ساعات غير محدّدة"} />
            <Field icon="dashboard" text={`⭐ ${Number(m.rating).toFixed(1)}`} />
          </div>
        </div>
      </div>

      {/* مؤشّرات */}
      <div style={styles.kpiGrid}>
        <Kpi label="إجمالي الطلبات" value={dz(m.orders_count)} color={colors.info} />
        <Kpi label="طلبات مُسلَّمة" value={dz(m.delivered_orders)} color={colors.success} />
        <Kpi label="الإيراد المُسلَّم" value={`${dz(m.revenue)} دج`} color={colors.primary} />
        <Kpi label="عمولة المنصّة" value={`${dz(m.commission)} دج`} color={colors.accent} />
        <Kpi label="متوسّط الطلب" value={`${dz(m.avg_order)} دج`} color={colors.warning} />
        <Kpi label="المنتجات" value={dz(m.products_count)} color={colors.info} />
      </div>

      <div style={styles.twoCol}>
        {/* آخر الطلبات */}
        <div className="card">
          <div style={styles.sectionTitle}>آخر الطلبات</div>
          {m.recent_orders.length === 0 ? (
            <div className="muted" style={{ textAlign: "center", padding: 24 }}>لا طلبات</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {m.recent_orders.map((o) => (
                <div key={o.id} style={styles.orderRow}>
                  <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>#{o.id.slice(0, 8)}</span>
                  <span className="muted" style={{ fontSize: 12, flex: 1 }}>
                    {o.items_count} عنصر · {o.created_at ? new Date(o.created_at).toLocaleDateString("fr-DZ") : "—"}
                  </span>
                  <StatusBadge status={o.status} size="sm" />
                  <span style={{ fontWeight: 800, color: colors.primary, minWidth: 80, textAlign: "left" }}>
                    {dz(o.total)} دج
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* توزيع الحالات + أعلى المنتجات */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <div style={styles.sectionTitle}>توزيع الحالات</div>
            {segments.length === 0 ? (
              <div className="muted" style={{ textAlign: "center", padding: 20 }}>لا بيانات</div>
            ) : (
              <>
                <div style={{ display: "grid", placeItems: "center", marginBottom: 12 }}>
                  <Donut segments={segments} size={140} centerLabel={dz(m.orders_count)} centerSub="طلب" />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {segments.map((s) => (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: s.color }} />
                      <span style={{ flex: 1, fontSize: 12 }}>{s.label}</span>
                      <span style={{ fontWeight: 700, fontSize: 12 }}>{dz(s.value)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="card">
            <div style={styles.sectionTitle}>الأكثر مبيعاً</div>
            {m.top_products.length === 0 ? (
              <div className="muted" style={{ textAlign: "center", padding: 20 }}>لا بيانات</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {m.top_products.map((p, i) => (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={styles.rank}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </span>
                    <span className="pill" style={{ background: colors.primarySoft, color: colors.primary, fontSize: 11 }}>
                      {dz(p.qty)} وحدة
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ icon, text }: { icon: Parameters<typeof Icon>[0]["name"]; text: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: colors.textMuted }}>
      <Icon name={icon} size={15} />
      {text}
    </span>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
      <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{label}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  hero: { display: "flex", gap: 18, alignItems: "flex-start", marginBottom: 16 },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 16,
    background: colors.surface,
    display: "grid",
    placeItems: "center",
    color: colors.textMuted,
    flexShrink: 0,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  twoCol: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 },
  sectionTitle: { fontSize: 15, fontWeight: 800, marginBottom: 12 },
  orderRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 12px",
    background: colors.surfaceAlt,
    borderRadius: 12,
  },
  rank: {
    width: 24,
    height: 24,
    borderRadius: 8,
    background: colors.surface,
    display: "grid",
    placeItems: "center",
    fontSize: 12,
    fontWeight: 800,
    color: colors.textMuted,
    flexShrink: 0,
  },
};
