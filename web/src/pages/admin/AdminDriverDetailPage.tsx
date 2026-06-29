import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

import { adminApi } from "../../api/admin";
import type { OrderStatus } from "../../api/types";
import { Donut } from "../../components/charts";
import { Icon } from "../../components/Icon";
import { StatusBadge } from "../../components/StatusBadge";
import { useToast } from "../../components/Toast";
import { colors, statusLabel } from "../../theme";

const VEHICLE_LABEL: Record<string, string> = { moto: "دراجة نارية", car: "سيارة", bike: "دراجة" };
const dz = (n: number) => Number(n || 0).toLocaleString("fr-DZ");

const STATUS_ORDER: OrderStatus[] = [
  "pending", "accepted", "preparing", "ready", "picked_up", "on_the_way", "delivered", "cancelled",
];

export function AdminDriverDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: ["admin-driver", id], queryFn: () => adminApi.driver(id), enabled: !!id });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-driver", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
    queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };
  const verify = useMutation({
    mutationFn: () => adminApi.verifyDriver(id),
    onSuccess: () => { invalidate(); toast.success("تم توثيق السائق"); },
    onError: (e) => toast.error((e as Error).message),
  });
  const unverify = useMutation({
    mutationFn: () => adminApi.unverifyDriver(id),
    onSuccess: () => { invalidate(); toast.success("تم تعطيل السائق"); },
    onError: (e) => toast.error((e as Error).message),
  });

  if (q.isLoading) return <div className="skeleton" style={{ height: 400 }} />;
  if (q.isError || !q.data) return <div className="error" style={{ padding: 24 }}>تعذّر تحميل السائق</div>;

  const d = q.data;
  const segments = STATUS_ORDER.map((st) => ({
    value: d.by_status?.[st] ?? 0,
    color: colors.status[st],
    label: statusLabel[st],
  })).filter((s) => s.value > 0);

  return (
    <div>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate("/admin/drivers")} style={{ marginBottom: 14 }}>
        ← عودة للسائقين
      </button>

      <div className="card" style={styles.hero}>
        <div style={styles.avatar}>
          <Icon name="drivers" size={30} />
          <span style={{ ...styles.onlineDot, background: d.is_online ? colors.success : colors.textFaint }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ fontSize: 22, fontWeight: 800 }}>{d.owner?.name || "سائق"}</h1>
            <span className="pill" style={{ background: colors.surface, color: colors.textMuted }}>
              {VEHICLE_LABEL[d.vehicle_type ?? ""] ?? d.vehicle_type ?? "مركبة"}
            </span>
            <span
              className="pill"
              style={{
                background: d.is_verified ? colors.successSoft : colors.warningSoft,
                color: d.is_verified ? colors.success : colors.warning,
              }}
            >
              {d.is_verified ? "موثَّق" : "بانتظار التوثيق"}
            </span>
            <span className="pill" style={{ background: d.is_online ? colors.successSoft : colors.surface, color: d.is_online ? colors.success : colors.textMuted }}>
              {d.is_online ? "متّصل" : "غير متّصل"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 18, marginTop: 10, flexWrap: "wrap", fontSize: 13 }}>
            <Field icon="bell" text={d.owner?.phone || "بلا هاتف"} />
            <Field icon="dashboard" text={`⭐ ${Number(d.rating).toFixed(1)}`} />
            {d.license_url && (
              <a href={d.license_url} target="_blank" rel="noreferrer" style={{ color: colors.info, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name="products" size={15} /> رخصة القيادة
              </a>
            )}
            {d.current_location && (
              <Field icon="location" text={`${d.current_location.lat.toFixed(4)}, ${d.current_location.lng.toFixed(4)}`} />
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {d.is_verified ? (
            <button className="btn btn-secondary" style={{ color: colors.danger }} onClick={() => unverify.mutate()} disabled={unverify.isPending}>
              تعطيل
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => verify.mutate()} disabled={verify.isPending}>
              توثيق السائق
            </button>
          )}
        </div>
      </div>

      <div style={styles.kpiGrid}>
        <Kpi label="إجمالي المهام" value={dz(d.total_assigned)} color={colors.info} />
        <Kpi label="توصيلات مكتملة" value={dz(d.deliveries)} color={colors.success} />
        <Kpi label="إجمالي الأرباح" value={`${dz(d.earnings)} دج`} color={colors.primary} />
        <Kpi label="طلبات نشطة" value={dz(d.active_orders)} color={colors.warning} />
      </div>

      <div style={styles.twoCol}>
        <div className="card">
          <div style={styles.sectionTitle}>آخر المهام</div>
          {d.recent_orders.length === 0 ? (
            <div className="muted" style={{ textAlign: "center", padding: 24 }}>لا مهام بعد</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {d.recent_orders.map((o) => (
                <div key={o.id} style={styles.orderRow}>
                  <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700 }}>#{o.id.slice(0, 8)}</span>
                  <span className="muted" style={{ fontSize: 12, flex: 1 }}>
                    {o.created_at ? new Date(o.created_at).toLocaleDateString("fr-DZ") : "—"}
                  </span>
                  <StatusBadge status={o.status} size="sm" />
                  <span style={{ fontWeight: 700, color: colors.success, minWidth: 70, textAlign: "left", fontSize: 13 }}>
                    +{dz(o.delivery_fee ?? 0)} دج
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div style={styles.sectionTitle}>توزيع المهام</div>
          {segments.length === 0 ? (
            <div className="muted" style={{ textAlign: "center", padding: 20 }}>لا بيانات</div>
          ) : (
            <>
              <div style={{ display: "grid", placeItems: "center", marginBottom: 12 }}>
                <Donut segments={segments} size={140} centerLabel={dz(d.total_assigned)} centerSub="مهمّة" />
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
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 16,
    background: colors.surface,
    display: "grid",
    placeItems: "center",
    color: colors.textMuted,
    flexShrink: 0,
    position: "relative",
  },
  onlineDot: {
    position: "absolute",
    bottom: 4,
    insetInlineStart: 4,
    width: 14,
    height: 14,
    borderRadius: "50%",
    border: "2px solid #fff",
  },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 },
  twoCol: { display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 },
  sectionTitle: { fontSize: 15, fontWeight: 800, marginBottom: 12 },
  orderRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: colors.surfaceAlt, borderRadius: 12 },
};
