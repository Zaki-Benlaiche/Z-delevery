import { useMemo, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { merchantsApi } from "../../api/merchants";
import { ordersApi } from "../../api/orders";
import type { Order, OrderStatus } from "../../api/types";
import { Screen } from "../../components/Screen";
import { EmptyState } from "../../components/EmptyState";
import { PriceTag } from "../../components/PriceTag";
import { StatusBadge } from "../../components/StatusBadge";
import { Icon, type IconName } from "../../components/Icon";
import { ImageUploadField } from "../../components/ImageUploadField";
import { CLOUDINARY_ENABLED } from "../../config";
import { useT } from "../../i18n";
import { timeAgo } from "../../utils/time";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../../theme/colors";

// الإجراء التالي المتاح لكل حالة (يُعرض كأزرار)
const NEXT: Partial<Record<OrderStatus, { status: OrderStatus; label: string; danger?: boolean }[]>> = {
  pending: [
    { status: "accepted", label: "قبول الطلب" },
    { status: "cancelled", label: "رفض", danger: true },
  ],
  accepted: [{ status: "preparing", label: "بدء التحضير" }],
  preparing: [{ status: "ready", label: "جاهز للاستلام" }],
};

// مجموعات التصفية — كل مجموعة تضمّ حالات الطلب التي تخصّها
type FilterKey = "all" | "new" | "active" | "ready" | "done";
const FILTERS: { key: FilterKey; label: string; match: (s: OrderStatus) => boolean }[] = [
  { key: "all", label: "الكل", match: () => true },
  { key: "new", label: "جديدة", match: (s) => s === "pending" },
  { key: "active", label: "قيد التحضير", match: (s) => s === "accepted" || s === "preparing" },
  { key: "ready", label: "جاهزة", match: (s) => s === "ready" },
  { key: "done", label: "منتهية", match: (s) => ["picked_up", "on_the_way", "delivered", "cancelled"].includes(s) },
];

const ACCENT_SOFT = colors.accent + "14";

export function MerchantOrdersScreen() {
  const { t } = useT();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterKey>("all");

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

  const setLogo = useMutation({
    mutationFn: (url: string) => merchantsApi.update(store.data!.id, { logo_url: url }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-merchant"] }),
    onError: (e) => Alert.alert("تعذّر حفظ الشعار", (e as Error).message),
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) => ordersApi.setStatus(id, status),
    onSuccess: (updated) =>
      queryClient.setQueryData<Order[]>(["orders"], (prev) =>
        prev?.map((o) => (o.id === updated.id ? updated : o)) ?? prev,
      ),
    onError: (e) => Alert.alert("تعذّر التحديث", (e as Error).message),
  });

  const all = orders.data ?? [];
  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: all.length, new: 0, active: 0, ready: 0, done: 0 };
    for (const o of all) {
      for (const f of FILTERS) if (f.key !== "all" && f.match(o.status)) c[f.key] += 1;
    }
    return c;
  }, [all]);

  const activeFilter = FILTERS.find((f) => f.key === filter)!;
  const visible = useMemo(() => all.filter((o) => activeFilter.match(o.status)), [all, activeFilter]);
  const pendingCount = counts.new;

  const isOpen = store.data?.is_open ?? false;

  return (
    <Screen padded={false} background="white">
      {/* رأس المتجر */}
      <View style={styles.header}>
        <View style={styles.logoWrap}>
          {CLOUDINARY_ENABLED && store.data ? (
            <ImageUploadField
              value={store.data.logo_url}
              onChange={(url) => setLogo.mutate(url)}
              shape="circle"
              size={48}
              label=""
              folder="zdelivry/logos"
            />
          ) : (
            <View style={styles.logoFallback}>
              <Icon name="store" size={22} color={colors.accent} />
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.storeName} numberOfLines={1}>{store.data?.name ?? "متجري"}</Text>
          <View style={[styles.statePill, isOpen ? styles.statePillOn : styles.statePillOff]}>
            <View style={[styles.stateDot, { backgroundColor: isOpen ? colors.success : colors.textFaint }]} />
            <Text style={[styles.stateText, { color: isOpen ? colors.success : colors.textMuted }]}>
              {isOpen ? "مفتوح الآن" : "مغلق"}
            </Text>
          </View>
        </View>
        <Switch
          value={isOpen}
          onValueChange={(v) => toggleOpen.mutate(v)}
          trackColor={{ true: colors.success, false: colors.border }}
          thumbColor="#fff"
        />
      </View>

      {/* شريط التصفية بالعدّادات */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTERS.map((f) => {
            const active = f.key === filter;
            const n = counts[f.key];
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                {n > 0 ? (
                  <View style={[styles.chipCount, active && styles.chipCountActive]}>
                    <Text style={[styles.chipCountText, active && styles.chipCountTextActive]}>{n}</Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={orders.isFetching && !orders.isLoading} onRefresh={() => orders.refetch()} tintColor={colors.primary} />
        }
        ListHeaderComponent={
          pendingCount > 0 && filter !== "done" ? (
            <View style={styles.alertBanner}>
              <View style={styles.alertIcon}>
                <Icon name="bell" size={16} color={colors.warning} />
              </View>
              <Text style={styles.alertText}>
                {pendingCount === 1 ? "طلب جديد بانتظار ردّك" : `${pendingCount} طلبات جديدة بانتظار ردّك`}
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !orders.isLoading ? (
            <EmptyState
              icon="🧾"
              title={filter === "all" ? "لا توجد طلبات" : "لا طلبات في هذه الحالة"}
              hint={filter === "all" ? "ستظهر طلبات زبائنك هنا فور وصولها" : "جرّب تبويباً آخر من الأعلى"}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            t={t}
            onAction={(status) => setStatus.mutate({ id: item.id, status })}
            pending={setStatus.isPending && setStatus.variables?.id === item.id}
          />
        )}
      />
    </Screen>
  );
}

function OrderCard({
  order,
  t,
  onAction,
  pending,
}: {
  order: Order;
  t: (k: string) => string;
  onAction: (s: OrderStatus) => void;
  pending: boolean;
}) {
  const actions = NEXT[order.status] ?? [];
  const isNew = order.status === "pending";
  const itemCount = order.items.reduce((s, i) => s + i.qty, 0);
  const payIcon: IconName = order.payment_method === "card" ? "card" : "cash";
  const payLabel = order.payment_method === "card" ? "بطاقة" : "نقداً";

  return (
    <View style={[styles.card, isNew && styles.cardNew]}>
      {/* ترويسة البطاقة */}
      <View style={styles.cardHead}>
        <View style={[styles.cardIcon, isNew && styles.cardIconNew]}>
          <Icon name="receipt" size={18} color={isNew ? "#fff" : colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderId}>طلب #{order.id.slice(0, 8)}</Text>
          <Text style={styles.orderMeta}>
            {itemCount} عنصر · {timeAgo(order.created_at, t)}
          </Text>
        </View>
        <StatusBadge status={order.status} size="sm" />
      </View>

      {/* العناصر */}
      <View style={styles.items}>
        {order.items.map((i) => (
          <View key={i.id} style={styles.itemRow}>
            <View style={styles.qtyChip}>
              <Text style={styles.qtyChipText}>×{i.qty}</Text>
            </View>
            <Text style={styles.itemName} numberOfLines={1}>{i.product_name}</Text>
          </View>
        ))}
      </View>

      {/* عنوان التسليم */}
      {order.delivery_details ? (
        <View style={styles.addrRow}>
          <Icon name="location" size={15} color={colors.textMuted} />
          <Text style={styles.addrText} numberOfLines={2}>{order.delivery_details}</Text>
        </View>
      ) : null}

      {/* تذييل: المجموع + الدفع */}
      <View style={styles.foot}>
        <View style={styles.payChip}>
          <Icon name={payIcon} size={13} color={colors.textMuted} />
          <Text style={styles.payText}>{payLabel}</Text>
        </View>
        <View style={styles.totalWrap}>
          <Text style={styles.totalLabel}>الإجمالي</Text>
          <PriceTag amount={Number(order.total)} size="md" />
        </View>
      </View>

      {/* أزرار الإجراء */}
      {actions.length > 0 ? (
        <View style={styles.actions}>
          {actions.map((a) => (
            <Pressable
              key={a.status}
              onPress={() => onAction(a.status)}
              disabled={pending}
              style={({ pressed }) => [
                styles.actionBtn,
                a.danger ? styles.actionDanger : styles.actionPrimary,
                pressed && { opacity: 0.85 },
                pending && { opacity: 0.6 },
              ]}
            >
              {!a.danger ? <Icon name="check" size={16} color="#fff" /> : null}
              <Text style={[styles.actionText, a.danger ? styles.actionTextDanger : styles.actionTextPrimary]}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // رأس المتجر
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  logoWrap: { width: 48, height: 48 },
  logoFallback: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: ACCENT_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  storeName: { fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  statePill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-end",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
    marginTop: 3,
  },
  statePillOn: { backgroundColor: colors.successSoft },
  statePillOff: { backgroundColor: colors.surface },
  stateDot: { width: 6, height: 6, borderRadius: 3 },
  stateText: { fontSize: fontSize.caption + 1, fontWeight: fontWeight.bold },

  // شريط التصفية
  filterBar: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  filterRow: { flexDirection: "row-reverse", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  chip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: fontSize.small, fontWeight: fontWeight.semibold, color: colors.textMuted },
  chipTextActive: { color: "#fff" },
  chipCount: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  chipCountActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  chipCountText: { fontSize: fontSize.caption, fontWeight: fontWeight.extrabold, color: colors.textMuted },
  chipCountTextActive: { color: "#fff" },

  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxxl },

  // بانر التنبيه
  alertBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  alertIcon: {
    width: 30, height: 30, borderRadius: radii.pill,
    backgroundColor: "rgba(245,158,11,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  alertText: { flex: 1, fontSize: fontSize.small, fontWeight: fontWeight.bold, color: "#92400E", textAlign: "right" },

  // بطاقة الطلب
  card: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.sm,
  },
  cardNew: { borderColor: colors.accent + "55", ...shadows.md },
  cardHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  cardIcon: {
    width: 40, height: 40, borderRadius: radii.md,
    backgroundColor: ACCENT_SOFT,
    alignItems: "center", justifyContent: "center",
  },
  cardIconNew: { backgroundColor: colors.accent },
  orderId: { fontSize: fontSize.body, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  orderMeta: { fontSize: fontSize.caption + 1, color: colors.textMuted, textAlign: "right", marginTop: 2 },

  // العناصر
  items: { gap: spacing.xs + 2 },
  itemRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  qtyChip: {
    minWidth: 30,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radii.sm,
    backgroundColor: ACCENT_SOFT,
    alignItems: "center",
  },
  qtyChipText: { fontSize: fontSize.small, fontWeight: fontWeight.extrabold, color: colors.accent },
  itemName: { flex: 1, fontSize: fontSize.body, color: colors.text, textAlign: "right" },

  // العنوان
  addrRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  addrText: { flex: 1, fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", lineHeight: 19 },

  // التذييل
  foot: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  payChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  payText: { fontSize: fontSize.caption + 1, fontWeight: fontWeight.semibold, color: colors.textMuted },
  totalWrap: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  totalLabel: { fontSize: fontSize.caption + 1, color: colors.textMuted },

  // الأزرار
  actions: { flexDirection: "row-reverse", gap: spacing.sm },
  actionBtn: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    height: 46,
    borderRadius: radii.lg,
  },
  actionPrimary: { backgroundColor: colors.accent, ...shadows.accent },
  actionDanger: { backgroundColor: colors.dangerSoft, flex: 0, paddingHorizontal: spacing.xl },
  actionText: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
  actionTextPrimary: { color: "#fff" },
  actionTextDanger: { color: colors.danger },
});
