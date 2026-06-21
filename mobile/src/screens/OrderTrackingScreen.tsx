import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ordersApi } from "../api/orders";
import type { Order, OrderStatus } from "../api/types";
import { RatingCard } from "../components/RatingCard";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { Icon } from "../components/Icon";
import { PriceTag } from "../components/PriceTag";
import { Skeleton } from "../components/Skeleton";
import { StatusBadge } from "../components/StatusBadge";
import { useT } from "../i18n";
import { useOrderTracking } from "../hooks/useOrderTracking";
import { colors, fontSize, fontWeight, radii, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "OrderTracking">;

const TIMELINE: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "ready",
  "picked_up",
  "on_the_way",
  "delivered",
];

const VEHICLE_KEY: Record<string, string> = {
  moto: "partner.vehMoto",
  car: "partner.vehCar",
  bike: "partner.vehBike",
};

function callPhone(phone: string, errLabel: string) {
  Linking.openURL(`tel:${phone}`).catch(() => Alert.alert(errLabel, phone));
}

export function OrderTrackingScreen({ route }: Props) {
  const { orderId, justPlaced } = route.params;
  const { t } = useT();
  const live = useOrderTracking(orderId);

  const query = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.detail(orderId),
    // نُحدّث الطلب فور وصول حدث بثّ لتحقّق الاتساق مع الـ DB
    refetchInterval: live.status ? 0 : 15_000,
  });

  if (query.isLoading || !query.data) {
    return (
      <Screen>
        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          <Skeleton width="100%" height={56} radius={radii.lg} />
          <Skeleton width="100%" height={220} radius={radii.lg} />
          <Skeleton width="50%" height={18} />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="80%" height={14} />
          ))}
        </View>
      </Screen>
    );
  }

  const order: Order = query.data;
  const status: OrderStatus = live.status ?? order.status;
  const dest = order.delivery_location;
  const driver = live.driverLocation;
  const hasMap = Boolean(dest);
  const showDriver =
    order.driver != null && status !== "delivered" && status !== "cancelled";

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {justPlaced && status !== "cancelled" ? (
          <View style={styles.successBanner}>
            <View style={styles.successIcon}>
              <Icon name="check" size={20} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.successTitle}>{t("track.placedTitle")}</Text>
              <Text style={styles.successSub}>{t("track.placedSub")}</Text>
            </View>
          </View>
        ) : null}
        <Card variant="soft" padding="md" style={styles.headerCard}>
          <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
          <StatusBadge status={status} />
          <Text style={styles.liveDot}>
            {live.connected ? t("track.live") : t("track.offline")}
          </Text>
        </Card>

        {hasMap ? (
          <View style={styles.mapWrap}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: dest!.lat,
                longitude: dest!.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Marker
                coordinate={{ latitude: dest!.lat, longitude: dest!.lng }}
                title={t("track.destination")}
                pinColor={colors.primary}
              />
              {driver ? (
                <Marker
                  coordinate={{ latitude: driver.lat, longitude: driver.lng }}
                  title={t("track.driverMarker")}
                  pinColor={colors.accent}
                />
              ) : null}
            </MapView>
          </View>
        ) : null}

        {showDriver ? <DriverCard driver={order.driver!} /> : null}

        <View style={styles.timeline}>
          <Text style={styles.section}>{t("track.progress")}</Text>
          {TIMELINE.map((s) => {
            const reached = TIMELINE.indexOf(s) <= TIMELINE.indexOf(status);
            return (
              <View key={s} style={styles.tlRow}>
                <View
                  style={[
                    styles.tlDot,
                    { backgroundColor: reached ? colors.primary : colors.border },
                  ]}
                />
                <Text
                  style={[
                    styles.tlLabel,
                    { color: reached ? colors.text : colors.textMuted },
                  ]}
                >
                  {t(`status.${s}`)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.summaryWrap}>
          <Text style={styles.section}>{t("track.details")}</Text>
          <Card variant="outlined" padding="md" style={{ gap: spacing.xs }}>
            {order.items.map((i) => (
              <View key={i.id} style={styles.sumRow}>
                <Text style={styles.sumLabel}>{i.qty}× {i.product_name}</Text>
                <PriceTag amount={Number(i.unit_price) * i.qty} size="sm" muted />
              </View>
            ))}
            <View style={styles.divider} />
            <SumRow label={t("track.subtotal")} amount={Number(order.subtotal)} />
            <SumRow label={t("track.deliveryFee")} amount={Number(order.delivery_fee)} />
            <SumRow label={t("track.total")} amount={Number(order.total)} bold />
            <Text style={styles.payNote}>
              {t("track.payLabel")}: {order.payment_method === "cash" ? t("track.payCash") : t("track.payCard")}
            </Text>
          </Card>
        </View>

        {status === "delivered" ? <RatingCard orderId={order.id} /> : null}
      </ScrollView>
    </Screen>
  );
}

function DriverCard({ driver }: { driver: NonNullable<Order["driver"]> }) {
  const { t } = useT();
  const vehicle = driver.vehicle_type
    ? VEHICLE_KEY[driver.vehicle_type]
      ? t(VEHICLE_KEY[driver.vehicle_type])
      : driver.vehicle_type
    : null;
  return (
    <View style={styles.driverWrap}>
      <Text style={styles.section}>{t("track.yourDriver")}</Text>
      <Card variant="outlined" padding="md" style={styles.driverCard}>
        <View style={styles.driverAvatar}>
          <Icon name="scooter" size={22} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.driverName} numberOfLines={1}>
            {driver.name || t("track.driverFallback")}
          </Text>
          <View style={styles.driverMeta}>
            <Icon name="star" size={13} color={colors.warning} />
            <Text style={styles.driverMetaText}>{driver.rating.toFixed(1)}</Text>
            {vehicle ? <Text style={styles.driverMetaText}>· {vehicle}</Text> : null}
          </View>
        </View>
        {driver.phone ? (
          <Pressable
            style={[styles.callBtn, { backgroundColor: colors.successSoft }]}
            onPress={() => callPhone(driver.phone!, t("driver.callError"))}
          >
            <Icon name="phone" size={20} color={colors.success} />
          </Pressable>
        ) : null}
      </Card>
    </View>
  );
}

function SumRow({ label, amount, bold }: { label: string; amount: number; bold?: boolean }) {
  return (
    <View style={styles.sumRow}>
      <Text style={[styles.sumLabel, bold && styles.bold]}>{label}</Text>
      <PriceTag amount={amount} size={bold ? "md" : "sm"} muted={!bold} />
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: spacing.xxl },
  successBanner: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.successSoft,
    borderRadius: radii.xl,
    padding: spacing.md,
    margin: spacing.lg,
    marginBottom: 0,
  },
  successIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.extrabold, color: colors.success, textAlign: "right" },
  successSub: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2, lineHeight: 19 },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    margin: spacing.lg,
    marginBottom: 0,
    gap: spacing.sm,
  },
  orderId: { fontSize: fontSize.small + 1, fontWeight: fontWeight.bold, color: colors.text },
  liveDot: { fontSize: fontSize.caption, color: colors.textMuted },
  mapWrap: { height: 260, margin: spacing.lg, borderRadius: radii.lg, overflow: "hidden" },
  map: { flex: 1 },
  driverWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  driverCard: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  driverAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  driverName: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  driverMeta: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, marginTop: 2 },
  driverMetaText: { fontSize: fontSize.caption + 1, color: colors.textMuted },
  callBtn: { width: 44, height: 44, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  timeline: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  section: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.sm, textAlign: "right" },
  tlRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs + 2 },
  tlDot: { width: 12, height: 12, borderRadius: 6 },
  tlLabel: { fontSize: fontSize.small + 1 },
  summaryWrap: { padding: spacing.lg },
  sumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs },
  sumLabel: { color: colors.textMuted, fontSize: fontSize.small + 1 },
  bold: { fontWeight: fontWeight.extrabold, color: colors.text },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  payNote: { fontSize: fontSize.caption + 1, color: colors.textMuted, marginTop: spacing.xs + 2, textAlign: "right" },
});
