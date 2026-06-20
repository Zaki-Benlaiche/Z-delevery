import { useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { ordersApi } from "../api/orders";
import type { Order, OrderStatus } from "../api/types";
import { Screen } from "../components/Screen";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { PriceTag } from "../components/PriceTag";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../auth/context";
import { useT } from "../i18n";
import { timeAgo } from "../utils/time";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "OrdersTab">,
  NativeStackScreenProps<AppStackParamList>
>;

type Filter = "all" | "active" | "done";
const DONE: OrderStatus[] = ["delivered", "cancelled"];
const isActive = (s: OrderStatus) => !DONE.includes(s);

export function OrdersScreen({ navigation }: Props) {
  const { user } = useAuth();
  const { t } = useT();
  const [filter, setFilter] = useState<Filter>("all");

  const query = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersApi.list(),
    // تحديث دوري كل 30 ثانية لمواكبة تغيّر حالة الطلبات
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
    enabled: !!user,
  });

  const all = query.data ?? [];
  const filtered = useMemo(() => {
    if (filter === "active") return all.filter((o) => isActive(o.status));
    if (filter === "done") return all.filter((o) => DONE.includes(o.status));
    return all;
  }, [all, filter]);

  if (!user) {
    return (
      <Screen>
        <View style={styles.header}>
          <Text style={styles.title}>{t("orders.title")}</Text>
        </View>
        <EmptyState
          icon="🧾"
          title={t("orders.empty")}
          hint={t("orders.emptyHintGuest")}
          ctaLabel={t("account.loginCtaTitle")}
          onCta={() => navigation.navigate("Connexion")}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("orders.title")}</Text>
        {all.length > 0 ? (
          <Text style={styles.subtitle}>{t("orders.count").replace("{n}", String(all.length))}</Text>
        ) : null}
      </View>

      {all.length > 0 ? (
        <View style={styles.filters}>
          <FilterChip label={t("common.all")} active={filter === "all"} onPress={() => setFilter("all")} />
          <FilterChip label={t("orders.filterActive")} active={filter === "active"} onPress={() => setFilter("active")} />
          <FilterChip label={t("orders.filterDone")} active={filter === "done"} onPress={() => setFilter("done")} />
        </View>
      ) : null}

      <FlatList
        data={filtered}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={() => query.refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !query.isLoading ? (
            <EmptyState
              icon="🧾"
              title={all.length === 0 ? t("orders.empty") : t("orders.noneFilter")}
              hint={all.length === 0 ? t("orders.emptyHint") : undefined}
              ctaLabel={all.length === 0 ? t("cart.browse") : undefined}
              onCta={all.length === 0 ? () => navigation.navigate("HomeTab") : undefined}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            t={t}
            onPress={() => navigation.navigate("OrderTracking", { orderId: item.id })}
          />
        )}
      />
    </Screen>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function OrderCard({ order, t, onPress }: { order: Order; t: (k: string) => string; onPress: () => void }) {
  const cur = t("common.currency");
  const statusColor = colors.status[order.status];
  const active = isActive(order.status);
  const itemsSummary = order.items
    .slice(0, 2)
    .map((i) => `${i.qty}× ${i.product_name}`)
    .join("، ");
  const extra = order.items.length > 2 ? ` +${order.items.length - 2}` : "";
  const itemCount = order.items.reduce((n, i) => n + i.qty, 0);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.99 }] }]}
    >
      {/* شريط حالة ملوّن على الحافّة */}
      <View style={[styles.statusRail, { backgroundColor: statusColor }]} />

      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <StatusBadge status={order.status} size="sm" />
          <Text style={styles.time}>{timeAgo(order.created_at, t)}</Text>
        </View>

        <Text style={styles.items} numberOfLines={2}>{itemsSummary}{extra}</Text>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Icon name="bag" size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{t("orders.itemCount").replace("{n}", String(itemCount))}</Text>
            </View>
            <View style={styles.metaChip}>
              <Icon name={order.payment_method === "cash" ? "cash" : "card"} size={12} color={colors.textMuted} />
              <Text style={styles.metaText}>{order.payment_method === "cash" ? t("cart.cash") : t("cart.card")}</Text>
            </View>
          </View>
          <PriceTag amount={Number(order.total)} size="md" currency={cur} />
        </View>

        {active ? (
          <View style={styles.trackRow}>
            <Icon name="navigation" size={14} color={colors.primary} />
            <Text style={styles.trackText}>{t("orders.track")}</Text>
            <Icon name="chevronLeft" size={16} color={colors.primary} />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  subtitle: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },

  filters: { flexDirection: "row-reverse", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.small, fontWeight: fontWeight.semibold, color: colors.textMuted },
  chipTextActive: { color: "#fff" },

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },

  card: {
    flexDirection: "row-reverse",
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: "hidden",
    ...shadows.sm,
  },
  statusRail: { width: 4 },
  cardBody: { flex: 1, padding: spacing.md, gap: spacing.sm },
  cardHeader: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  time: { fontSize: fontSize.caption + 1, color: colors.textMuted },
  items: { fontSize: fontSize.small + 1, color: colors.text, textAlign: "right", lineHeight: 20 },
  divider: { height: 1, backgroundColor: colors.divider },
  cardFooter: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  metaChip: { flexDirection: "row-reverse", alignItems: "center", gap: 4 },
  metaText: { fontSize: fontSize.caption + 1, color: colors.textMuted },

  trackRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  trackText: { flex: 1, fontSize: fontSize.small, fontWeight: fontWeight.bold, color: colors.primary, textAlign: "right" },
});
