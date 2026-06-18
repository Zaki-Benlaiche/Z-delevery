import { useQuery } from "@tanstack/react-query";

import { adminApi } from "../../api/admin";
import { colors } from "../../theme";

export function AdminDashboardPage() {
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: adminApi.stats });

  const cards = [
    { label: "المتاجر", value: stats.data?.merchants, color: colors.primary, bg: colors.primarySoft },
    { label: "السائقون", value: stats.data?.drivers, color: colors.accent, bg: "#E6FAFB" },
    { label: "الطلبات", value: stats.data?.orders, color: colors.info, bg: colors.infoSoft },
    { label: "طلبات معلّقة", value: stats.data?.pending_orders, color: colors.warning, bg: colors.warningSoft },
  ];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>لوحة القيادة</h1>
      <p className="muted" style={{ marginBottom: 20, fontSize: 13 }}>نظرة عامة على المنصّة</p>

      {stats.isLoading ? (
        <div className="muted">...جاري التحميل</div>
      ) : stats.isError ? (
        <div className="error">تعذّر تحميل الإحصائيات — تأكّد من صلاحية الأدمن</div>
      ) : (
        <>
          <div style={styles.grid}>
            {cards.map((c) => (
              <div key={c.label} className="card" style={styles.statCard}>
                <div style={{ ...styles.statIcon, background: c.bg, color: c.color }}>●</div>
                <div style={{ fontSize: 30, fontWeight: 800, color: colors.text }}>{c.value ?? 0}</div>
                <div className="muted" style={{ fontSize: 13 }}>{c.label}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div className="muted" style={{ fontSize: 13 }}>إجمالي المبيعات (الطلبات المُسلَّمة)</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: colors.success, marginTop: 4 }}>
                {Number(stats.data?.sales ?? 0).toLocaleString("fr-DZ")} دج
              </div>
            </div>
            <div style={{ ...styles.statIcon, background: colors.successSoft, color: colors.success }}>دج</div>
          </div>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 },
  statCard: { display: "flex", flexDirection: "column", gap: 4 },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: 14,
    marginBottom: 6,
  },
};
