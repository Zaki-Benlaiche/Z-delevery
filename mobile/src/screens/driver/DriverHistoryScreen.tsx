import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { driversApi } from "../../api/drivers";
import { ordersApi } from "../../api/orders";
import type { Order } from "../../api/types";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { Icon, type IconName } from "../../components/Icon";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../../theme/colors";

function money(n: number): string {
  return `${Math.round(n).toLocaleString("fr-DZ")} دج`;
}

export function DriverHistoryScreen() {
  const earnings = useQuery({
    queryKey: ["driver", "earnings"],
    queryFn: driversApi.earnings,
    refetchInterval: 30_000,
  });

  const delivered = useQuery({
    queryKey: ["driver", "delivered"],
    queryFn: () => ordersApi.list("delivered"),
    refetchInterval: 30_000,
  });

  const e = earnings.data;

  const Header = (
    <View style={{ gap: spacing.md }}>
      {/* بطاقة الأرباح الرئيسية */}
      <View style={styles.hero}>
        <Text style={styles.heroLabel}>إجمالي أرباحك</Text>
        {earnings.isLoading ? (
          <Skeleton width={160} height={34} radius={radii.sm} />
        ) : (
          <Text style={styles.heroValue}>{money(e?.total_earnings ?? 0)}</Text>
        )}
        <View style={styles.heroFoot}>
          <Icon name="scooter" size={16} color="rgba(255,255,255,0.9)" />
          <Text style={styles.heroSub}>{e?.deliveries ?? 0} توصيلة مكتملة</Text>
        </View>
      </View>

      {/* بطاقات الإحصاء */}
      <View style={styles.statRow}>
        <StatCard
          icon="cash"
          tint={colors.success}
          value={money(e?.today_earnings ?? 0)}
          label={`اليوم · ${e?.today_deliveries ?? 0} توصيلة`}
        />
        <StatCard
          icon="receipt"
          tint={colors.primary}
          value={String(e?.active_orders ?? 0)}
          label="طلبات جارية"
        />
        <StatCard
          icon="star"
          tint={colors.warning}
          value={Number(e?.rating ?? 0).toFixed(1)}
          label="تقييمك"
        />
      </View>

      <Text style={styles.sectionTitle}>سجلّ التوصيلات</Text>
    </View>
  );

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>أرباحي</Text>
      </View>
      <FlatList
        data={delivered.data ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={Header}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm + 2 }} />}
        refreshControl={
          <RefreshControl
            refreshing={delivered.isFetching && !delivered.isLoading}
            onRefresh={() => {
              earnings.refetch();
              delivered.refetch();
            }}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !delivered.isLoading ? (
            <EmptyState
              icon="🛵"
              title="لا توصيلات بعد"
              hint="ستظهر هنا توصيلاتك المكتملة وأرباحها"
            />
          ) : null
        }
        renderItem={({ item }) => <DeliveredCard order={item} />}
      />
    </Screen>
  );
}

function StatCard({ icon, tint, value, label }: { icon: IconName; tint: string; value: string; label: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tint + "1A" }]}>
        <Icon name={icon} size={16} color={tint} />
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function DeliveredCard({ order }: { order: Order }) {
  const count = order.items.reduce((s, i) => s + i.qty, 0);
  return (
    <Card variant="outlined" padding="sm" style={styles.card}>
      <View style={styles.cardIcon}>
        <Icon name="check" size={18} color={colors.success} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardId}>#{order.id.slice(0, 8)}</Text>
        <Text style={styles.cardDate}>
          {count} عناصر · {new Date(order.created_at).toLocaleDateString("fr-DZ")}
        </Text>
      </View>
      <View style={{ alignItems: "flex-end" }}>
        <Text style={styles.earn}>+{money(Number(order.delivery_fee))}</Text>
        <Text style={styles.earnLabel}>توصيل</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },

  hero: {
    backgroundColor: colors.accent,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.xs,
    ...shadows.accent,
  },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontSize: fontSize.small, fontWeight: fontWeight.semibold, textAlign: "right" },
  heroValue: { color: "#fff", fontSize: 32, fontWeight: fontWeight.extrabold, textAlign: "right" },
  heroFoot: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  heroSub: { color: "rgba(255,255,255,0.9)", fontSize: fontSize.small, fontWeight: fontWeight.semibold },

  statRow: { flexDirection: "row-reverse", gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: spacing.xs,
    alignItems: "flex-end",
    ...shadows.sm,
  },
  statIcon: { width: 32, height: 32, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: fontSize.body, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  statLabel: { fontSize: fontSize.caption, color: colors.textMuted, textAlign: "right" },

  sectionTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right", marginTop: spacing.sm },

  card: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  cardIcon: { width: 38, height: 38, borderRadius: radii.pill, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center" },
  cardId: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  cardDate: { fontSize: fontSize.caption + 1, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  earn: { fontSize: fontSize.body, fontWeight: fontWeight.extrabold, color: colors.success },
  earnLabel: { fontSize: fontSize.caption, color: colors.textMuted },
});
