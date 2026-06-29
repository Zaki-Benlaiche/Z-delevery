import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";

import { adminApi } from "../../api/admin";
import type { OrderStatus } from "../../api/types";
import { AreaChart, BarChart, Donut, ProgressBar, Sparkline } from "../../components/charts";
import { Icon, type IconName } from "../../components/Icon";
import { colors, statusLabel } from "../../theme";

const dz = (n: number) => Number(n || 0).toLocaleString("fr-DZ");

// ترتيب الحالات في الحلقة + ألوانها من نظام التصميم
const STATUS_ORDER: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "picked_up",
  "on_the_way",
  "delivered",
  "cancelled",
];

export function AdminDashboardPage() {
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: adminApi.stats, refetchInterval: 30_000 });

  if (stats.isLoading) return <DashboardSkeleton />;
  if (stats.isError || !stats.data)
    return <div className="error" style={{ padding: 24 }}>تعذّر تحميل الإحصائيات — تأكّد من صلاحية الأدمن</div>;

  const s = stats.data;
  const daily = s.daily ?? [];
  const dailyRevenue = daily.map((d) => d.revenue);
  const dailyOrders = daily.map((d) => d.orders);
  const dayLabels = daily.map((d) => {
    const dt = new Date(d.date);
    return `${dt.getDate()}/${dt.getMonth() + 1}`;
  });

  const statusSegments = STATUS_ORDER.map((st) => ({
    value: s.by_status?.[st] ?? 0,
    color: colors.status[st],
    label: statusLabel[st],
  })).filter((seg) => seg.value > 0);

  return (
    <div>
      <header style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800 }}>لوحة القيادة</h1>
        <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
          نظرة شاملة وحيّة على أداء المنصّة · تتحدّث تلقائياً
        </p>
      </header>

      {/* ── شريط ملخّص اليوم ── */}
      <div style={styles.todayBar}>
        <TodayChip icon="orders" label="طلبات اليوم" value={dz(s.orders_today)} accent={colors.primary} />
        <TodayChip icon="dashboard" label="إيراد اليوم" value={`${dz(s.revenue_today)} دج`} accent={colors.success} />
        <TodayChip icon="clock" label="طلبات نشطة الآن" value={dz(s.active_orders)} accent={colors.info} />
        <TodayChip icon="bell" label="بانتظار القبول" value={dz(s.pending_orders)} accent={colors.warning} />
      </div>

      {/* ── بطاقات مؤشّرات الأداء الماليّة ── */}
      <div style={styles.kpiGrid}>
        <KpiCard
          title="إجمالي المبيعات"
          value={`${dz(s.sales)} دج`}
          sub={`${dz(s.delivered_orders)} طلب مُسلَّم`}
          icon="orders"
          color={colors.success}
        >
          <Sparkline data={dailyRevenue} color={colors.success} width={120} height={34} />
        </KpiCard>

        <KpiCard
          title="عمولة المنصّة"
          value={`${dz(s.commission)} دج`}
          sub="صافي إيراد المنصّة"
          icon="dashboard"
          color={colors.primary}
        >
          <Sparkline data={dailyRevenue} color={colors.primary} width={120} height={34} />
        </KpiCard>

        <KpiCard
          title="متوسّط قيمة الطلب"
          value={`${dz(s.avg_order)} دج`}
          sub="لكلّ طلب مُسلَّم"
          icon="products"
          color={colors.info}
        />

        <KpiCard
          title="الطلبات الكليّة"
          value={dz(s.orders)}
          sub={`${dz(s.cancelled_orders)} ملغى`}
          icon="orders"
          color={colors.accent}
        >
          <Sparkline data={dailyOrders} color={colors.accent} width={120} height={34} />
        </KpiCard>
      </div>

      {/* ── رسمان: اتجاه الإيراد + توزيع الحالات ── */}
      <div style={styles.chartsRow}>
        <div className="card" style={{ gridColumn: "span 2" }}>
          <div style={styles.cardHead}>
            <div>
              <div style={styles.cardTitle}>اتجاه الإيراد</div>
              <div className="muted" style={{ fontSize: 12 }}>آخر 14 يوماً (الطلبات المُسلَّمة)</div>
            </div>
            <span className="pill" style={{ background: colors.successSoft, color: colors.success }}>
              {dz(dailyRevenue.reduce((a, b) => a + b, 0))} دج
            </span>
          </div>
          <AreaChart data={dailyRevenue} color={colors.success} height={190} formatY={(v) => `${dz(v)} دج`} />
          <div style={styles.barWrap}>
            <BarChart data={dailyOrders} labels={dayLabels} height={70} color={colors.primary} />
            <div className="muted" style={{ fontSize: 11, marginTop: 6, textAlign: "center" }}>
              عدد الطلبات اليومي
            </div>
          </div>
        </div>

        <div className="card">
          <div style={styles.cardTitle}>توزيع الطلبات</div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>حسب الحالة</div>
          {statusSegments.length === 0 ? (
            <div className="muted" style={{ textAlign: "center", padding: 30 }}>لا طلبات بعد</div>
          ) : (
            <>
              <div style={{ display: "grid", placeItems: "center", marginBottom: 14 }}>
                <Donut segments={statusSegments} centerLabel={dz(s.orders)} centerSub="طلب" />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {statusSegments.map((seg) => (
                  <div key={seg.label} style={styles.legendRow}>
                    <span style={{ ...styles.legendDot, background: seg.color }} />
                    <span style={{ flex: 1, fontSize: 13 }}>{seg.label}</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{dz(seg.value)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── بطاقات شبكة المنصّة (متاجر/سائقون/عملاء) ── */}
      <div style={styles.countGrid}>
        <CountCard
          icon="store"
          label="المتاجر"
          value={s.merchants}
          color={colors.primary}
          bar={{ value: s.open_merchants, max: s.merchants, note: `${dz(s.open_merchants)} مفتوح الآن` }}
        />
        <CountCard
          icon="drivers"
          label="السائقون"
          value={s.drivers}
          color={colors.accent}
          bar={{ value: s.online_drivers, max: s.drivers, note: `${dz(s.online_drivers)} متّصل · ${dz(s.verified_drivers)} موثَّق` }}
        />
        <CountCard
          icon="users"
          label="العملاء"
          value={s.customers}
          color={colors.info}
        />
        <CountCard
          icon="orders"
          label="طلبات نشطة"
          value={s.active_orders}
          color={colors.warning}
          bar={{ value: s.active_orders, max: s.orders || 1, note: `من ${dz(s.orders)} إجمالاً` }}
        />
      </div>
    </div>
  );
}

// ───────────────── مكوّنات مساعدة ─────────────────
function TodayChip({ icon, label, value, accent }: { icon: IconName; label: string; value: string; accent: string }) {
  return (
    <div style={styles.todayChip}>
      <div style={{ ...styles.todayIcon, background: `${accent}1a`, color: accent }}>
        <Icon name={icon} size={18} />
      </div>
      <div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
        <div className="muted" style={{ fontSize: 11 }}>{label}</div>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  sub,
  icon,
  color,
  children,
}: {
  title: string;
  value: string;
  sub: string;
  icon: IconName;
  color: string;
  children?: ReactNode;
}) {
  return (
    <div className="card card-hover" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="muted" style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 25, fontWeight: 800, marginTop: 6, color: colors.text }}>{value}</div>
        </div>
        <div style={{ ...styles.kpiIcon, background: `${color}14`, color }}>
          <Icon name={icon} size={20} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <span className="muted" style={{ fontSize: 12 }}>{sub}</span>
        {children}
      </div>
    </div>
  );
}

function CountCard({
  icon,
  label,
  value,
  color,
  bar,
}: {
  icon: IconName;
  label: string;
  value: number;
  color: string;
  bar?: { value: number; max: number; note: string };
}) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ ...styles.kpiIcon, background: `${color}14`, color }}>
          <Icon name={icon} size={20} />
        </div>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{dz(value)}</div>
          <div className="muted" style={{ fontSize: 12 }}>{label}</div>
        </div>
      </div>
      {bar && (
        <div>
          <ProgressBar value={bar.value} max={bar.max} color={color} />
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>{bar.note}</div>
        </div>
      )}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div>
      <div className="skeleton" style={{ height: 30, width: 200, marginBottom: 24 }} />
      <div style={styles.kpiGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 120 }} />
        ))}
      </div>
      <div style={{ ...styles.chartsRow, marginTop: 16 }}>
        <div className="skeleton" style={{ height: 320, gridColumn: "span 2" }} />
        <div className="skeleton" style={{ height: 320 }} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  todayBar: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12,
    marginBottom: 16,
  },
  todayChip: {
    background: colors.bg,
    border: `1px solid ${colors.borderSoft}`,
    borderRadius: 14,
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    gap: 11,
    boxShadow: "var(--shadow-sm)",
  },
  todayIcon: { width: 38, height: 38, borderRadius: 11, display: "grid", placeItems: "center", flexShrink: 0 },

  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
  },
  kpiIcon: { width: 42, height: 42, borderRadius: 12, display: "grid", placeItems: "center", flexShrink: 0 },

  chartsRow: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: 14,
    marginTop: 16,
  },
  cardHead: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  cardTitle: { fontSize: 16, fontWeight: 800, color: colors.text },
  barWrap: { marginTop: 16, paddingTop: 14, borderTop: `1px solid ${colors.borderSoft}` },

  legendRow: { display: "flex", alignItems: "center", gap: 9 },
  legendDot: { width: 10, height: 10, borderRadius: 3, flexShrink: 0 },

  countGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginTop: 16,
  },
};
