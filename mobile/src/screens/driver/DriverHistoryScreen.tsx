import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { driversApi } from "../../api/drivers";
import { ordersApi } from "../../api/orders";
import type { Order } from "../../api/types";
import { Screen } from "../../components/Screen";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { Icon, type IconName } from "../../components/Icon";
import { useT } from "../../i18n";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../../theme/colors";

type TFn = (key: string) => string;

function money(n: number, cur: string): string {
  return `${Math.round(n).toLocaleString("fr-DZ")} ${cur}`;
}

export function DriverHistoryScreen() {
  const { t } = useT();
  const cur = t("common.currency");
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
          <Text style={styles.heroLabel}>{t("driver.totalEarnings")}</Text>
        </View>
        {earnings.isLoading ? (
          <Skeleton width={180} height={38} radius={radii.sm} />
        ) : (
          <Text style={styles.heroValue}>{money(e?.total_earnings ?? 0, cur)}</Text>
        )}
        <View style={styles.heroFootRow}>
          <View style={styles.heroChip}>
            <Icon name="check" size={13} color="#fff" />
            <Text style={styles.heroChipText}>{e?.deliveries ?? 0} {t("driver.deliveriesWord")}</Text>
          </View>
          <View style={styles.heroChip}>
            <Icon name="scooter" size={13} color="#fff" />
            <Text style={styles.heroChipText}>{money(avg, cur)} {t("driver.perDelivery")}</Text>
          </View>
        </View>
      </View>

      {/* بطاقات الإحصاء */}
      <View style={styles.statRow}>
        <StatCard
          icon="cash"
          tint={colors.success}
          value={money(e?.today_earnings ?? 0, cur)}
          label={`${t("driver.today")} · ${e?.today_deliveries ?? 0} ${t("driver.deliveriesWord")}`}
          loading={earnings.isLoading}
        />
        <StatCard
          icon="receipt"
          tint={colors.info}
          value={String(e?.active_orders ?? 0)}
          label={t("driver.activeOrders")}
          loading={earnings.isLoading}
        />
        <StatCard
          icon="star"
          tint={colors.warning}
          value={Number(e?.rating ?? 0).toFixed(1)}
          label={t("driver.yourRating")}
          loading={earnings.isLoading}
        />
      </View>

      <Text style={styles.sectionTitle}>{t("driver.deliveryHistory")}</Text>
    </View>
  );

  return (
    <Screen padded={false} background="white">
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>{t("driver.earnings")}</Text>
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
              title={t("driver.noDeliveries")}
              hint={t("driver.noDeliveriesHint")}
            />
          ) : null
        }
        renderItem={({ item }) => <DeliveredCard order={item} t={t} cur={cur} />}
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

function DeliveredCard({ order, t, cur }: { order: Order; t: TFn; cur: string }) {
  const count = order.items.reduce((s, i) => s + i.qty, 0);
  return (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Icon name="check" size={18} color={colors.success} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardId}>#{order.id.slice(0, 8)}</Text>
        <Text style={styles.cardDate}>
          {count} {t("driver.items")} · {new Date(order.created_at).toLocaleDateString("fr-DZ")}
        </Text>
      </View>
      <View style={{ alignItems: "flex-start" }}>
        <Text style={styles.earn}>+{money(Number(order.delivery_fee), cur)}</Text>
        <Text style={styles.earnLabel}>{t("driver.yourFee")}</Text>
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
