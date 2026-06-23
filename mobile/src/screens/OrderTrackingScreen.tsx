import { useEffect, useRef, useState } from "react";
import { Alert, Animated, Easing, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ordersApi } from "../api/orders";
import type { Order, OrderStatus } from "../api/types";
import { RatingCard } from "../components/RatingCard";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { Icon, type IconName } from "../components/Icon";
import { PriceTag } from "../components/PriceTag";
import { Skeleton } from "../components/Skeleton";
import { MAPS_ENABLED } from "../config";
import { useT } from "../i18n";
import { useOrderTracking } from "../hooks/useOrderTracking";
import { haversineKm, etaMinutes } from "../utils/geo";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
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

// أيقونة معبّرة لكل مرحلة في الخطّ الزمني
const STEP_ICON: Record<OrderStatus, IconName> = {
  pending: "receipt",
  accepted: "check",
  preparing: "restaurant",
  ready: "bag",
  picked_up: "scooter",
  on_the_way: "navigation",
  delivered: "home",
  cancelled: "close",
};

const VEHICLE_KEY: Record<string, string> = {
  moto: "partner.vehMoto",
  car: "partner.vehCar",
  bike: "partner.vehBike",
};

function callPhone(phone: string, errLabel: string) {
  Linking.openURL(`tel:${phone}`).catch(() => Alert.alert(errLabel, phone));
}

export function OrderTrackingScreen({ route, navigation }: Props) {
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
  const currentIndex = TIMELINE.indexOf(status);
  const dest = order.delivery_location;
  const driver = live.driverLocation;
  const hasMap = Boolean(dest);
  const showDriver =
    order.driver != null && status !== "delivered" && status !== "cancelled";

  // تقدير حيّ لمسافة/وقت وصول السائق إليك (من بثّ موقعه إلى وجهة التسليم)
  const driverDistKm = driver && dest ? haversineKm(driver, dest) : null;
  const driverEta = driverDistKm != null ? etaMinutes(driverDistKm) : null;

  const heroColor =
    status === "delivered" ? colors.success : status === "cancelled" ? colors.danger : colors.accent;

  return (
    <Screen padded={false}>
      {justPlaced && status !== "cancelled" ? <SuccessToast t={t} /> : null}

      <View style={styles.header}>
        <Pressable hitSlop={8} style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("track.title")}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ===== هيرو الحالة ===== */}
        <View style={[styles.hero, { backgroundColor: heroColor }]}>
          <View style={styles.heroBlob1} />
          <View style={styles.heroBlob2} />
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <Icon name={STEP_ICON[status]} size={28} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroStatus} numberOfLines={1}>{t(`status.${status}`)}</Text>
              <Text style={styles.heroSub} numberOfLines={2}>
                {status === "cancelled" ? t("track.cancelledSub") : t(`track.sub.${status}`)}
              </Text>
            </View>
          </View>
          <View style={styles.heroFoot}>
            <Text style={styles.heroOrderId}>#{order.id.slice(0, 8).toUpperCase()}</Text>
            <View style={styles.heroLive}>
              <View style={[styles.heroLiveDot, { backgroundColor: live.connected ? "#fff" : "rgba(255,255,255,0.45)" }]} />
              <Text style={styles.heroLiveText}>{live.connected ? t("track.liveShort") : t("track.offlineShort")}</Text>
            </View>
          </View>
        </View>

        {/* ===== الخريطة (إن توفّر المفتاح) أو بطاقة الوجهة ===== */}
        {MAPS_ENABLED && hasMap ? (
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
        ) : order.delivery_details || hasMap ? (
          <View style={styles.destCard}>
            <View style={styles.destIcon}>
              <Icon name="locationFill" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.destLabel}>{t("track.destination")}</Text>
              <Text style={styles.destValue} numberOfLines={2}>
                {order.delivery_details || t("track.destinationSet")}
              </Text>
            </View>
          </View>
        ) : null}

        {showDriver ? <DriverCard driver={order.driver!} distanceKm={driverDistKm} etaMin={driverEta} /> : null}

        <View style={styles.timeline}>
          <Text style={styles.section}>{t("track.progress")}</Text>
          {status === "cancelled" ? (
            <View style={styles.cancelledCard}>
              <View style={styles.cancelledIcon}>
                <Icon name="close" size={22} color={colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cancelledTitle}>{t("status.cancelled")}</Text>
                <Text style={styles.cancelledSub}>{t("track.cancelledSub")}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.steps}>
              {TIMELINE.map((s, i) => {
                const current = i === currentIndex;
                const done = i < currentIndex;
                return (
                  <TimelineStep
                    key={s}
                    icon={STEP_ICON[s]}
                    label={t(`status.${s}`)}
                    sub={t(`track.sub.${s}`)}
                    done={done}
                    current={current}
                    isLast={i === TIMELINE.length - 1}
                    nowLabel={t("track.now")}
                  />
                );
              })}
            </View>
          )}
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

function DriverCard({
  driver,
  distanceKm,
  etaMin,
}: {
  driver: NonNullable<Order["driver"]>;
  distanceKm: number | null;
  etaMin: number | null;
}) {
  const { t } = useT();
  const vehicle = driver.vehicle_type
    ? VEHICLE_KEY[driver.vehicle_type]
      ? t(VEHICLE_KEY[driver.vehicle_type])
      : driver.vehicle_type
    : null;
  const distLabel =
    distanceKm == null
      ? null
      : distanceKm < 1
        ? `${Math.round(distanceKm * 1000)} ${t("track.unitM")}`
        : `${distanceKm.toFixed(1)} ${t("track.unitKm")}`;
  return (
    <View style={styles.driverWrap}>
      <Text style={styles.section}>{t("track.yourDriver")}</Text>
      <Card variant="outlined" padding="md" style={styles.driverCardWrap}>
        <View style={styles.driverCard}>
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
        </View>

        {/* شريط حيّ: مسافة ووقت وصول السائق إليك */}
        {distLabel ? (
          <View style={styles.etaRow}>
            <View style={styles.etaPulse} />
            <Icon name="navigation" size={15} color={colors.accent} />
            <Text style={styles.etaText}>
              {t("track.driverAway")} <Text style={styles.etaStrong}>{distLabel}</Text>
              {etaMin != null ? <Text> · ~{etaMin} {t("track.minute")}</Text> : null}
            </Text>
          </View>
        ) : (
          <View style={styles.etaRow}>
            <Icon name="clock" size={15} color={colors.textMuted} />
            <Text style={styles.etaWaiting}>{t("track.driverWaitingMove")}</Text>
          </View>
        )}
      </Card>
    </View>
  );
}

/** إشعار نجاح مؤقّت ينزلق للأعلى ويختفي تلقائياً بعد لحظات */
function SuccessToast({ t }: { t: (k: string) => string }) {
  const insets = useSafeAreaInsets();
  const [gone, setGone] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 280, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
        if (finished) setGone(true);
      });
    }, 3200);
    return () => clearTimeout(timer);
  }, [anim]);

  if (gone) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.toast,
        {
          top: insets.top + spacing.sm,
          opacity: anim,
          transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
        },
      ]}
    >
      <View style={styles.toastIcon}>
        <Icon name="check" size={18} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.toastTitle} numberOfLines={1}>{t("track.placedTitle")}</Text>
        <Text style={styles.toastSub} numberOfLines={2}>{t("track.placedSub")}</Text>
      </View>
    </Animated.View>
  );
}

/** خطوة واحدة في الخطّ الزمني: أيقونة في دائرة + خطّ واصل + عنوان ووصف */
function TimelineStep({
  icon,
  label,
  sub,
  done,
  current,
  isLast,
  nowLabel,
}: {
  icon: IconName;
  label: string;
  sub: string;
  done: boolean;
  current: boolean;
  isLast: boolean;
  nowLabel: string;
}) {
  const active = done || current;
  const circleBg = current ? colors.accent : done ? colors.primary : colors.surface;
  const iconColor = active ? "#fff" : colors.textFaint;
  return (
    <View style={styles.step}>
      <View style={styles.stepIconCol}>
        <View
          style={[
            styles.stepCircle,
            { backgroundColor: circleBg, borderColor: active ? circleBg : colors.border },
            current && styles.stepCircleCurrent,
          ]}
        >
          <Icon name={done ? "check" : icon} size={current ? 20 : 17} color={iconColor} />
        </View>
        {!isLast ? <View style={[styles.connector, { backgroundColor: done ? colors.primary : colors.border }]} /> : null}
      </View>
      <View style={[styles.stepBody, isLast && { paddingBottom: 0 }]}>
        <View style={styles.stepTitleRow}>
          <Text style={[styles.stepLabel, current && styles.stepLabelCurrent, !active && styles.stepLabelMuted]} numberOfLines={1}>
            {label}
          </Text>
          {current ? (
            <View style={styles.nowBadge}>
              <Text style={styles.nowBadgeText}>{nowLabel}</Text>
            </View>
          ) : null}
        </View>
        <Text style={[styles.stepSub, !active && styles.stepSubMuted]} numberOfLines={2}>{sub}</Text>
      </View>
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
  // إشعار النجاح المؤقّت (عائم أعلى الشاشة)
  toast: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 50,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.text,
    borderRadius: radii.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...shadows.lg,
  },
  toastIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.pill,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  toastTitle: { fontSize: fontSize.body, fontWeight: fontWeight.extrabold, color: "#fff", textAlign: "right" },
  toastSub: { fontSize: fontSize.caption + 1, color: "rgba(255,255,255,0.82)", textAlign: "right", marginTop: 1, lineHeight: 17 },
  // الهيدر المخصّص
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text },

  // هيرو الحالة
  hero: {
    margin: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.xxl,
    padding: spacing.lg,
    overflow: "hidden",
    ...shadows.accent,
  },
  heroBlob1: { position: "absolute", top: -50, insetInlineEnd: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(255,255,255,0.12)" },
  heroBlob2: { position: "absolute", bottom: -40, insetInlineStart: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(255,255,255,0.08)" },
  heroRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  heroIcon: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  heroStatus: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: "#fff", textAlign: "right" },
  heroSub: { fontSize: fontSize.small, color: "rgba(255,255,255,0.9)", textAlign: "right", marginTop: 2, lineHeight: 19 },
  heroFoot: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.22)",
  },
  heroOrderId: { fontSize: fontSize.small, fontWeight: fontWeight.bold, color: "rgba(255,255,255,0.95)", letterSpacing: 0.5 },
  heroLive: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs },
  heroLiveDot: { width: 7, height: 7, borderRadius: 4 },
  heroLiveText: { fontSize: fontSize.caption + 1, fontWeight: fontWeight.bold, color: "rgba(255,255,255,0.95)" },

  // بطاقة الوجهة (بديل الخريطة عند غياب المفتاح)
  destCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    ...shadows.sm,
  },
  destIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  destLabel: { fontSize: fontSize.caption + 1, color: colors.textMuted, textAlign: "right" },
  destValue: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.text, textAlign: "right", marginTop: 2 },

  mapWrap: { height: 220, marginHorizontal: spacing.lg, borderRadius: radii.lg, overflow: "hidden" },
  map: { flex: 1 },
  driverWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  driverCardWrap: { gap: spacing.md },
  driverCard: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  etaRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  etaPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent },
  etaText: { flex: 1, fontSize: fontSize.small, color: colors.text, textAlign: "right" },
  etaStrong: { fontWeight: fontWeight.extrabold, color: colors.accent },
  etaWaiting: { flex: 1, fontSize: fontSize.small, color: colors.textMuted, textAlign: "right" },
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
  section: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.md, textAlign: "right" },
  steps: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.lg,
    paddingBottom: spacing.md,
    ...shadows.sm,
  },
  step: { flexDirection: "row-reverse", alignItems: "stretch", gap: spacing.md },
  stepIconCol: { alignItems: "center", width: 40 },
  stepCircle: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  stepCircleCurrent: { ...shadows.accent },
  connector: { width: 2.5, flex: 1, minHeight: 18, borderRadius: 2, marginVertical: 2 },
  stepBody: { flex: 1, paddingBottom: spacing.lg, paddingTop: spacing.xs },
  stepTitleRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  stepLabel: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  stepLabelCurrent: { color: colors.accent, fontWeight: fontWeight.extrabold },
  stepLabelMuted: { color: colors.textMuted, fontWeight: fontWeight.semibold },
  stepSub: { fontSize: fontSize.caption + 1, color: colors.textMuted, textAlign: "right", marginTop: 2, lineHeight: 17 },
  stepSubMuted: { color: colors.textFaint },
  nowBadge: { backgroundColor: colors.accent, paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
  nowBadgeText: { fontSize: fontSize.caption, fontWeight: fontWeight.bold, color: "#fff" },
  cancelledCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderRadius: radii.xl,
    padding: spacing.lg,
  },
  cancelledIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: "rgba(239,68,68,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelledTitle: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.extrabold, color: colors.danger, textAlign: "right" },
  cancelledSub: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2, lineHeight: 19 },
  summaryWrap: { padding: spacing.lg },
  sumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs },
  sumLabel: { color: colors.textMuted, fontSize: fontSize.small + 1 },
  bold: { fontWeight: fontWeight.extrabold, color: colors.text },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.sm },
  payNote: { fontSize: fontSize.caption + 1, color: colors.textMuted, marginTop: spacing.xs + 2, textAlign: "right" },
});
