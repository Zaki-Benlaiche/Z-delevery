import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ordersApi } from "../api/orders";
import type { Order, OrderStatus } from "../api/types";
import { StatusBadge } from "../components/StatusBadge";
import { colors, statusLabel } from "../theme";

// انتقالات حالة الطلب المتاحة للتاجر
const MERCHANT_NEXT: Partial<Record<OrderStatus, OrderStatus[]>> = {
  pending: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready"],
};

const ACTIVE_STATUSES: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "picked_up",
  "on_the_way",
];

export function OrdersPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"active" | "history">("active");

  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersApi.list(),
    // التاجر يحتاج معرفة وصول الطلبات الجديدة سريعاً
    refetchInterval: 5_000,
    // إبقاء النتائج الحالية أثناء كل refetch — يمنع الوميض بين التحديثات
    placeholderData: (prev) => prev,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      ordersApi.setStatus(id, status),
    onSuccess: (updated) => {
      queryClient.setQueryData<Order[]>(["orders"], (prev) =>
        prev?.map((o) => (o.id === updated.id ? updated : o)) ?? prev,
      );
    },
    onError: (e) => alert(`تعذّر التحديث: ${(e as Error).message}`),
  });

  const filtered = useMemo(() => {
    const list = orders.data ?? [];
    return tab === "active"
      ? list.filter((o) => ACTIVE_STATUSES.includes(o.status))
      : list.filter((o) => !ACTIVE_STATUSES.includes(o.status));
  }, [orders.data, tab]);

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>الطلبات</h1>
          <p className="muted" style={{ fontSize: 13 }}>
            تحديث تلقائي كل 5 ثوانٍ
          </p>
        </div>
        <div style={styles.tabs}>
          <button
            onClick={() => setTab("active")}
            style={{ ...styles.tab, ...(tab === "active" ? styles.tabActive : {}) }}
          >
            الجارية
          </button>
          <button
            onClick={() => setTab("history")}
            style={{ ...styles.tab, ...(tab === "history" ? styles.tabActive : {}) }}
          >
            المنتهية
          </button>
        </div>
      </div>

      {orders.isLoading ? (
        <div className="muted">...جاري التحميل</div>
      ) : filtered.length === 0 ? (
        <div className="muted" style={{ textAlign: "center", padding: 40 }}>
          {tab === "active" ? "لا توجد طلبات جارية الآن" : "لا توجد طلبات منتهية بعد"}
        </div>
      ) : (
        <div style={styles.grid}>
          {filtered.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onAction={(status) => setStatus.mutate({ id: order.id, status })}
              pending={setStatus.isPending && setStatus.variables?.id === order.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderCard({
  order,
  onAction,
  pending,
}: {
  order: Order;
  onAction: (status: OrderStatus) => void;
  pending: boolean;
}) {
  const nextOptions = MERCHANT_NEXT[order.status] ?? [];
  const created = new Date(order.created_at);

  return (
    <div className="card" style={styles.orderCard}>
      <div style={styles.orderHeader}>
        <div>
          <div style={styles.orderId}>#{order.id.slice(0, 8)}</div>
          <div style={styles.orderTime}>{created.toLocaleTimeString("ar-DZ")}</div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div style={styles.items}>
        {order.items.map((i) => (
          <div key={i.id} style={styles.itemRow}>
            <span style={styles.itemQty}>×{i.qty}</span>
            <span style={{ flex: 1 }}>{i.product_name}</span>
            <span className="muted">{(Number(i.unit_price) * i.qty).toFixed(0)} دج</span>
          </div>
        ))}
      </div>

      {order.delivery_details && (
        <div style={styles.address}>📍 {order.delivery_details}</div>
      )}

      <div style={styles.totals}>
        <span className="muted">
          {Number(order.subtotal).toFixed(0)} + {Number(order.delivery_fee).toFixed(0)} توصيل
        </span>
        <span style={{ fontWeight: 800, fontSize: 16, color: colors.primary }}>
          {Number(order.total).toFixed(0)} دج
        </span>
      </div>

      {nextOptions.length > 0 && (
        <div style={styles.actions}>
          {nextOptions.map((s) => (
            <button
              key={s}
              onClick={() => onAction(s)}
              disabled={pending}
              className={s === "cancelled" ? "btn btn-secondary" : "btn btn-primary"}
              style={{ flex: 1 }}
            >
              {s === "cancelled" ? "رفض" : statusLabel[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: 800 },
  tabs: { display: "flex", gap: 4, background: colors.surface, padding: 4, borderRadius: 10 },
  tab: { padding: "8px 16px", borderRadius: 8, color: colors.textMuted, fontWeight: 600 },
  tabActive: { background: colors.bg, color: colors.primary, boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 16,
  },
  orderCard: { display: "flex", flexDirection: "column", gap: 12 },
  orderHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  orderId: { fontWeight: 700, fontSize: 13, color: colors.textMuted },
  orderTime: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  items: { display: "flex", flexDirection: "column", gap: 4 },
  itemRow: { display: "flex", gap: 8, alignItems: "center", fontSize: 14 },
  itemQty: { fontWeight: 700, color: colors.primary, minWidth: 28 },
  address: {
    fontSize: 13,
    background: colors.surface,
    padding: "8px 10px",
    borderRadius: 8,
    color: colors.text,
  },
  totals: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTop: `1px solid ${colors.border}`,
  },
  actions: { display: "flex", gap: 8 },
};
