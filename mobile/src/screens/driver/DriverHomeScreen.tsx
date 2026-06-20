import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { driversApi, type Driver } from "../../api/drivers";
import { ordersApi } from "../../api/orders";
import type { Order } from "../../api/types";
import { Screen } from "../../components/Screen";
import { EmptyState } from "../../components/EmptyState";
import { Skeleton } from "../../components/Skeleton";
import { Icon, type IconName } from "../../components/Icon";
import { useCurrentLocation } from "../../hooks/useLocation";
import { useDriverLocationSender } from "../../hooks/useDriverLocationSender";
import { useT } from "../../i18n";
import { timeAgo } from "../../utils/time";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../../theme/colors";
import type { DriverStackParamList, DriverTabParamList } from "../../navigation/types";
import { DriverRegisterScreen } from "./DriverRegisterScreen";

type Props = CompositeScreenProps<
  BottomTabScreenProps<DriverTabParamList, "DriverHomeTab">,
  NativeStackScreenProps<DriverStackParamList>
>;
type TFn = (key: string) => string;

// مفاتيح ترجمة نوع المركبة
const VEHICLE_KEY: Record<string, string> = { moto: "partner.vehMoto", car: "partner.vehCar", bike: "partner.vehBike" };

function money(n: number, cur: string): string {
  return `${Math.round(n).toLocaleString("fr-DZ")} ${cur}`;
}

export function DriverHomeScreen({ navigation }: Props) {
  const loc = useCurrentLocation();
  const me = useQuery({ queryKey: ["driver", "me"], queryFn: driversApi.me, retry: false });

  if (me.isLoading) {
    return (
      <Screen>
        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          <Skeleton width="100%" height={120} radius={radii.xl} />
          <Skeleton width="100%" height={72} radius={radii.lg} />
          {[0, 1].map((i) => <Skeleton key={i} width="100%" height={96} radius={radii.lg} />)}
        </View>
      </Screen>
    );
  }
  if (me.error || !me.data) return <DriverRegisterScreen />;

  return <DriverHomeContent driver={me.data} navigation={navigation} userLat={loc.location?.lat} userLng={loc.location?.lng} />;
}

interface ContentProps {
  driver: Driver;
  navigation: Props["navigation"];
  userLat?: number;
  userLng?: number;
}

function DriverHomeContent({ driver, navigation, userLat, userLng }: ContentProps) {
  const { t } = useT();
  const cur = t("common.currency");
  const queryClient = useQueryClient();
  const verified = driver.is_verified;
  const online = driver.is_online;

  const toggleOnline = useMutation({
    mutationFn: (next: boolean) => driversApi.setOnline(next),
    onSuccess: (d) => queryClient.setQueryData(["driver", "me"], d),
    onError: (e) => Alert.alert(t("driver.toggleError"), (e as Error).message),
  });

  const earnings = useQuery({
    queryKey: ["driver", "earnings"],
    queryFn: driversApi.earnings,
    refetchInterval: 30_000,
  });

  const available = useQuery({
    queryKey: ["driver", "available", userLat, userLng],
    queryFn: () => driversApi.availableOrders(userLat, userLng),
    enabled: online,
    refetchInterval: online ? 12_000 : false,
  });

  const myActive = useQuery({
    queryKey: ["driver", "my-orders"],
    queryFn: () => ordersApi.list(),
    refetchInterval: 20_000,
  });

  const activeOrders = (myActive.data ?? []).filter((o) =>
    ["accepted", "preparing", "ready", "picked_up", "on_the_way"].includes(o.status),
  );

  useDriverLocationSender(online || activeOrders.length > 0);

  const e = earnings.data;

  return (
    <Screen padded={false} background="white">
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>{t("tab.work")}</Text>
        <View style={[styles.statusPill, online ? styles.statusPillOn : styles.statusPillOff]}>
          <View style={[styles.statusDot, { backgroundColor: online ? colors.success : colors.textFaint }]} />
          <Text style={[styles.statusPillText, { color: online ? colors.success : colors.textMuted }]}>
            {online ? t("driver.online") : t("driver.offline")}
          </Text>
        </View>
      </View>

      <FlatList
        data={online ? available.data ?? [] : []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.lg }}>
            {/* لافتة انتظار التوثيق */}
            {!verified ? (
              <View style={styles.pending}>
                <View style={styles.pendingIcon}>
                  <Icon name="shield" size={22} color={colors.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingTitle}>{t("driver.pendingTitle")}</Text>
                  <Text style={styles.pendingSub}>{t("driver.pendingSub")}</Text>
                </View>
              </View>
            ) : null}

            {/* بطاقة الاتّصال */}
            <View style={[styles.hero, online && styles.heroOn]}>
              <View style={styles.heroTop}>
                <View style={[styles.heroAvatar, online && styles.heroAvatarOn]}>
                  <Icon name="scooter" size={28} color={online ? "#fff" : colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.heroTitle, online && styles.onText]}>
                    {!verified ? t("driver.heroPending") : online ? t("driver.heroOnline") : t("driver.heroStart")}
                  </Text>
                  <Text style={[styles.heroSub, online && styles.onTextSoft]}>
                    {!verified
                      ? t("driver.heroSubPending")
                      : online
                        ? t("driver.heroSubOnline")
                        : t("driver.heroSubStart")}
                  </Text>
                </View>
                <Switch
                  value={online}
                  onValueChange={(v) => toggleOnline.mutate(v)}
                  disabled={!verified}
                  trackColor={{ true: "rgba(255,255,255,0.45)", false: colors.border }}
                  thumbColor="#fff"
                  ios_backgroundColor={colors.border}
                />
              </View>
              <View style={[styles.heroMetaRow, online && styles.heroMetaRowOn]}>
                <Icon name="scooter" size={14} color={online ? "rgba(255,255,255,0.9)" : colors.textMuted} />
                <Text style={[styles.heroMeta, online && styles.onTextSoft]}>
                  {VEHICLE_KEY[driver.vehicle_type] ? t(VEHICLE_KEY[driver.vehicle_type]) : driver.vehicle_type}
                </Text>
                <View style={[styles.heroMetaSep, online && { backgroundColor: "rgba(255,255,255,0.4)" }]} />
                <Icon name="star" size={14} color={online ? "rgba(255,255,255,0.9)" : colors.warning} />
                <Text style={[styles.heroMeta, online && styles.onTextSoft]}>
                  {Number(driver.rating || 0).toFixed(1)}
                </Text>
                {!driver.is_verified ? (
                  <>
                    <View style={[styles.heroMetaSep, online && { backgroundColor: "rgba(255,255,255,0.4)" }]} />
                    <Text style={[styles.heroMeta, online && styles.onTextSoft]}>{t("driver.pendingShort")}</Text>
                  </>
                ) : null}
              </View>
            </View>

            {/* إحصاء اليوم */}
            <View style={styles.statRow}>
              <StatCard
                icon="cash"
                tint={colors.success}
                value={money(e?.today_earnings ?? 0, cur)}
                label={t("driver.todayEarnings")}
                loading={earnings.isLoading}
              />
              <StatCard
                icon="check"
                tint={colors.accent}
                value={String(e?.today_deliveries ?? 0)}
                label={t("driver.todayDeliveries")}
                loading={earnings.isLoading}
              />
              <StatCard
                icon="receipt"
                tint={colors.info}
                value={String(activeOrders.length)}
                label={t("driver.activeOrders")}
              />
            </View>

            {/* الطلبات الجارية */}
            {activeOrders.length > 0 ? (
              <View style={{ gap: spacing.md }}>
                <Text style={styles.sectionTitle}>{t("driver.yourActive")}</Text>
                {activeOrders.map((o) => (
                  <OrderCard key={o.id} order={o} accent t={t} cur={cur} onPress={() => navigation.navigate("DriverOrder", { orderId: o.id })} />
                ))}
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>
              {online ? t("driver.availableNear") : t("driver.available")}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={available.isFetching && !available.isLoading}
            onRefresh={() => {
              available.refetch();
              earnings.refetch();
            }}
            tintColor={colors.accent}
          />
        }
        ListEmptyComponent={
          online && !available.isLoading ? (
            <EmptyState icon="🛵" title={t("driver.noOrders")} hint={t("driver.noOrdersHint")} />
          ) : !online ? (
            <EmptyState icon="⚡" title={t("driver.offlineTitle")} hint={t("driver.offlineHint")} />
          ) : null
        }
        renderItem={({ item }) => (
          <OrderCard order={item} t={t} cur={cur} onPress={() => navigation.navigate("DriverOrder", { orderId: item.id })} />
        )}
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
        <Skeleton width={48} height={16} radius={radii.xs} />
      ) : (
        <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      )}
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

function OrderCard({ order, onPress, accent, t, cur }: { order: Order; onPress: () => void; accent?: boolean; t: TFn; cur: string }) {
  const count = order.items.reduce((s, i) => s + i.qty, 0);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, accent && styles.cardAccent, pressed && { opacity: 0.92 }]}
    >
      <View style={styles.cardHead}>
        <View style={[styles.cardIcon, accent && { backgroundColor: colors.accent }]}>
          <Icon name="receipt" size={20} color={accent ? "#fff" : colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardId}>{t("driver.order")} #{order.id.slice(0, 8)}</Text>
          <Text style={styles.cardMeta}>{count} {t("driver.items")} · {timeAgo(order.created_at, t)}</Text>
        </View>
        <View style={styles.payout}>
          <Text style={styles.payoutValue}>{money(Number(order.delivery_fee), cur)}</Text>
          <Text style={styles.payoutLabel}>{t("driver.yourFee")}</Text>
        </View>
      </View>

      {order.delivery_details ? (
        <View style={styles.addrRow}>
          <Icon name="location" size={15} color={colors.textMuted} />
          <Text style={styles.addrText} numberOfLines={1}>{order.delivery_details}</Text>
        </View>
      ) : null}

      <View style={styles.cardFoot}>
        <Text style={styles.collectText}>{t("driver.collect")} {money(Number(order.total), cur)}</Text>
        <View style={[styles.cta, accent && styles.ctaAccent]}>
          <Text style={styles.ctaText}>{accent ? t("driver.continueDelivery") : t("driver.viewClaim")}</Text>
          <Icon name="chevronLeft" size={15} color="#fff" />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
  },
  topTitle: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.text },
  statusPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    height: 30,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  statusPillOn: { backgroundColor: colors.successSoft, borderColor: "transparent" },
  statusPillOff: { backgroundColor: colors.surface, borderColor: colors.borderSoft },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusPillText: { fontSize: fontSize.caption + 1, fontWeight: fontWeight.bold },

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },

  // لافتة التوثيق
  pending: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.warningSoft,
    borderRadius: radii.xl,
    padding: spacing.md,
  },
  pendingIcon: {
    width: 44, height: 44, borderRadius: radii.pill,
    backgroundColor: "rgba(245,158,11,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  pendingTitle: { fontSize: fontSize.body, fontWeight: fontWeight.extrabold, color: "#92400E", textAlign: "right" },
  pendingSub: { fontSize: fontSize.small, color: "#B45309", textAlign: "right", marginTop: 2, lineHeight: 19 },

  // بطاقة الاتّصال
  hero: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    gap: spacing.md,
    ...shadows.sm,
  },
  heroOn: { backgroundColor: colors.accent, borderColor: colors.accent, ...shadows.accent },
  heroTop: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  heroAvatar: {
    width: 52, height: 52, borderRadius: radii.pill,
    backgroundColor: colors.accent + "14",
    alignItems: "center", justifyContent: "center",
  },
  heroAvatarOn: { backgroundColor: "rgba(255,255,255,0.22)" },
  heroTitle: { fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  heroSub: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  onText: { color: "#fff" },
  onTextSoft: { color: "rgba(255,255,255,0.9)" },
  heroMetaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  heroMetaRowOn: { borderTopColor: "rgba(255,255,255,0.25)" },
  heroMeta: { fontSize: fontSize.small, fontWeight: fontWeight.semibold, color: colors.textMuted },
  heroMetaSep: { width: 1, height: 12, backgroundColor: colors.border, marginHorizontal: spacing.xs },

  // إحصاء
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
  cardAccent: { borderColor: colors.accent, backgroundColor: colors.accent + "0A" },
  cardHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  cardIcon: { width: 42, height: 42, borderRadius: radii.md, backgroundColor: colors.accent + "14", alignItems: "center", justifyContent: "center" },
  cardId: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  cardMeta: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  payout: { alignItems: "flex-start" },
  payoutValue: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.accent },
  payoutLabel: { fontSize: fontSize.caption, color: colors.textMuted, marginTop: 1 },

  addrRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, backgroundColor: colors.surface, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.md },
  addrText: { flex: 1, fontSize: fontSize.small, color: colors.text, textAlign: "right" },

  cardFoot: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  collectText: { fontSize: fontSize.small, color: colors.textMuted, fontWeight: fontWeight.medium },
  cta: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, backgroundColor: colors.accent, height: 40, paddingHorizontal: spacing.lg, borderRadius: radii.lg },
  ctaAccent: { backgroundColor: colors.accent },
  ctaText: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.small + 1 },
});
