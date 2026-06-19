import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { driversApi } from "../../api/drivers";
import { ordersApi } from "../../api/orders";
import type { Order } from "../../api/types";
import { Screen } from "../../components/Screen";
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
  const avg = e && e.deliveries > 0 ? e.total_earnings / e.deliveries : 0;

  const Header = (
    <View style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
      {/* بطاقة الأرباح الرئيسية */}
      <View style={styles.hero}>
        <View style={styles.heroHead}>
          <View style={styles.heroBadge}>
            <Icon name="cash" size={16} color="#fff" />
          </View>
          <Text style={styles.heroLabel}>إجمالي أرباحك</Text>
        </View>
        {earnings.isLoading ? (
          <Skeleton width={180} height={38} radius={radii.sm} />
        ) : (
          <Text style={styles.heroValue}>{money(e?.total_earnings ?? 0)}</Text>
        )}
        <View style={styles.heroFootRow}>
          <View style={styles.heroChip}>
            <Icon name="check" size={13} color="#fff" />
            <Text style={styles.heroChipText}>{e?.deliveries ?? 0} توصيلة</Text>
          </View>
          <View style={styles.heroChip}>
            <Icon name="scooter" size={13} color="#fff" />
            <Text style={styles.heroChipText}>{money(avg)} / توصيلة</Text>
          </View>
        </View>
      </View>

      {/* بطاقات الإحصاء */}
      <View style={styles.statRow}>
        <StatCard
          icon="cash"
          tint={colors.success}
          value={money(e?.today_earnings ?? 0)}
          label={`اليوم · ${e?.today_deliveries ?? 0} توصيلة`}
          loading={earnings.isLoading}
        />
        <StatCard
          icon="receipt"
          tint={colors.info}
          value={String(e?.active_orders ?? 0)}
          label="طلبات جارية"
          loading={earnings.isLoading}
        />
        <StatCard
          icon="star"
          tint={colors.warning}
          value={Number(e?.rating ?? 0).toFixed(1)}
          label="تقييمك"
          loading={earnings.isLoading}
        />
      </View>

      <Text style={styles.sectionTitle}>سجلّ التوصيلات</Text>
    </View>
  );

  return (
    <Screen padded={false} background="white">
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>أرباحي</Text>
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
            tintColor={colors.accent}
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

function StatCard({ icon, tint, value, label, loading }: { icon: IconName; tint: string; value: string; label: string; loading?: boolean }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tint + "1A" }]}>
        <Icon name={icon} size={15} color={tint} />
      </View>
      {loading ? (
        <Skeleton width={44} height={16} radius={radii.xs} />
      ) : (
        <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      )}
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

function DeliveredCard({ order }: { order: Order }) {
  const count = order.items.reduce((s, i) => s + i.qty, 0);
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Icon name="check" size={18} color={colors.success} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardId}>#{order.id.slice(0, 8)}</Text>
        <Text style={styles.cardDate}>
          {count} عناصر · {new Date(order.created_at).toLocaleDateString("fr-DZ")}
        </Text>
      </View>
      <View style={{ alignItems: "flex-start" }}>
        <Text style={styles.earn}>+{money(Number(order.delivery_fee))}</Text>
        <Text style={styles.earnLabel}>أجرتك</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.sm },
  topTitle: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },

  hero: {
    backgroundColor: colors.accent,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadows.accent,
  },
  heroHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  heroBadge: {
    width: 30, height: 30, borderRadius: radii.md,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center", justifyContent: "center",
  },
  heroLabel: { color: "rgba(255,255,255,0.9)", fontSize: fontSize.small, fontWeight: fontWeight.semibold },
  heroValue: { color: "#fff", fontSize: fontSize.display, fontWeight: fontWeight.extrabold, textAlign: "right" },
  heroFootRow: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.xs },
  heroChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.pill,
  },
  heroChipText: { color: "#fff", fontSize: fontSize.caption + 1, fontWeight: fontWeight.semibold },

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
  statIcon: { width: 30, height: 30, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  statLabel: { fontSize: fontSize.caption, color: colors.textMuted, textAlign: "right" },

  sectionTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },

  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    ...shadows.sm,
  },
  cardIcon: { width: 38, height: 38, borderRadius: radii.pill, backgroundColor: colors.successSoft, alignItems: "center", justifyContent: "center" },
  cardId: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  cardDate: { fontSize: fontSize.caption + 1, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  earn: { fontSize: fontSize.body, fontWeight: fontWeight.extrabold, color: colors.success },
  earnLabel: { fontSize: fontSize.caption, color: colors.textMuted },
});
