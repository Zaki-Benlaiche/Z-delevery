import { useQuery } from "@tanstack/react-query";

import { adminApi } from "../../api/admin";
import { StatusBadge } from "../../components/StatusBadge";
import { colors } from "../../theme";

export function AdminOrdersPage() {
  const orders = useQuery({ queryKey: ["admin-orders"], queryFn: adminApi.orders });
  const rows = orders.data ?? [];

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>الطلبات</h1>
      <p className="muted" style={{ marginBottom: 16, fontSize: 13 }}>آخر 100 طلب على المنصّة</p>

      {orders.isLoading ? (
        <div className="muted">...جاري التحميل</div>
      ) : rows.length === 0 ? (
        <div className="muted" style={{ textAlign: "center", padding: 40 }}>لا طلبات بعد</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((o) => (
            <div key={o.id} className="card" style={styles.row}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "monospace" }}>
                  #{o.id.slice(0, 8)}
                </div>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  {o.items_count} عنصر · {new Date(o.created_at).toLocaleString("fr-DZ")}
                </div>
              </div>
              <StatusBadge status={o.status} size="sm" />
              <div style={{ fontWeight: 800, color: colors.primary, minWidth: 90, textAlign: "left" }}>
                {Number(o.total).toLocaleString("fr-DZ")} دج
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  row: { display: "flex", gap: 12, alignItems: "center" },
};
