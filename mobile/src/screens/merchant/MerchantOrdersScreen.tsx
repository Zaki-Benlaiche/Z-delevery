import { Alert, FlatList, RefreshControl, StyleSheet, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { merchantsApi } from "../../api/merchants";
import { ordersApi } from "../../api/orders";
import type { Order, OrderStatus } from "../../api/types";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { EmptyState } from "../../components/EmptyState";
import { PriceTag } from "../../components/PriceTag";
import { StatusBadge } from "../../components/StatusBadge";
import { colors, fontSize, fontWeight, radii, spacing } from "../../theme/colors";

const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string; danger?: boolean }[]>> = {
  pending: [
    { status: "accepted", label: "قبول" },
    { status: "cancelled", label: "رفض", danger: true },
  ],
  accepted: [{ status: "preparing", label: "بدء التحضير" }],
  preparing: [{ status: "ready", label: "جاهز للاستلام" }],
};

export function MerchantOrdersScreen() {
  const queryClient = useQueryClient();

  const store = useQuery({ queryKey: ["my-merchant"], queryFn: merchantsApi.mine, retry: false });
  const orders = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersApi.list(),
    refetchInterval: 8000,
    placeholderData: (p) => p,
  });

  const toggleOpen = useMutation({
    mutationFn: (open: boolean) => merchantsApi.update(store.data!.id, { is_open: open }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-merchant"] }),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => ordersApi.setStatus(id, status),
    onSuccess: (updated) =>
      queryClient.setQueryData<Order[]>(["orders"], (prev) =>
        prev?.map((o) => (o.id === updated.id ? updated : o)) ?? prev,
      ),
    onError: (e) => Alert.alert("تعذّر التحديث", (e as Error).message),
  });

  const isOpen = store.data?.is_open ?? false;

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.storeName} numberOfLines={1}>{store.data?.name ?? "متجري"}</Text>
          <Text style={[styles.statusText, { color: isOpen ? colors.success : colors.textMuted }]}>
            {isOpen ? "● مفتوح الآن" : "● مغلق"}
          </Text>
        </View>
        <Switch
          value={isOpen}
          onValueChange={(v) => toggleOpen.mutate(v)}
          trackColor={{ true: colors.success, false: colors.border }}
          thumbColor="#fff"
        />
      </View>

      <FlatList
        data={orders.data ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={
          <RefreshControl refreshing={orders.isFetching && !orders.isLoading} onRefresh={() => orders.refetch()} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !orders.isLoading ? <EmptyState icon="🧾" title="لا توجد طلبات" hint="ستظهر طلبات زبائنك هنا فور وصولها" /> : null
        }
        renderItem={({ item }) => (
          <OrderCard order={item} onAction={(status) => setStatus.mutate({ id: item.id, status })} pending={setStatus.isPending} />
        )}
      />
    </Screen>
  );
}

function OrderCard({ order, onAction, pending }: { order: Order; onAction: (s: OrderStatus) => void; pending: boolean }) {
  const actions = NEXT[order.status] ?? [];
  return (
    <Card variant="elevated" padding="md" style={{ gap: spacing.sm }}>
      <View style={styles.cardHead}>
        <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
        <StatusBadge status={order.status} />
      </View>
      {order.items.map((i) => (
        <View key={i.id} style={styles.itemRow}>
          <Text style={styles.qty}>×{i.qty}</Text>
          <Text style={{ flex: 1, textAlign: "right", color: colors.text }} numberOfLines={1}>{i.product_name}</Text>
        </View>
      ))}
      {order.delivery_details ? <Text style={styles.addr}>📍 {order.delivery_details}</Text> : null}
      <View style={styles.foot}>
        <PriceTag amount={Number(order.total)} size="md" />
        <Text style={styles.time}>{new Date(order.created_at).toLocaleTimeString("ar-DZ")}</Text>
      </View>
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Button key={a.status} label={a.label} variant={a.danger ? "secondary" : "primary"} size="sm" onPress={() => onAction(a.status)} loading={pending} style={{ flex: 1 }} />
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  storeName: { fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  statusText: { fontSize: fontSize.small, fontWeight: fontWeight.semibold, textAlign: "right", marginTop: 2 },
  list: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  cardHead: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontSize: fontSize.small, color: colors.textMuted, fontWeight: fontWeight.bold },
  itemRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  qty: { fontWeight: fontWeight.bold, color: colors.primary, fontSize: fontSize.body },
  addr: { fontSize: fontSize.small, color: colors.textMuted, backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radii.sm, textAlign: "right" },
  foot: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  time: { fontSize: fontSize.caption, color: colors.textMuted },
  actions: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.xs },
});
