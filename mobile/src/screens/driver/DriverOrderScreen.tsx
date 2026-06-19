import { useRef } from "react";
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapView, { Marker, Polyline } from "react-native-maps";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { driversApi, type DriverOrderDetail } from "../../api/drivers";
import type { OrderStatus } from "../../api/types";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { PriceTag } from "../../components/PriceTag";
import { Skeleton } from "../../components/Skeleton";
import { Icon } from "../../components/Icon";
import { StatusBadge, statusLabel } from "../../components/StatusBadge";
import { useCurrentLocation } from "../../hooks/useLocation";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../../theme/colors";
import type { DriverStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<DriverStackParamList, "DriverOrder">;

// الانتقالات المتاحة للسائق على ترتيب التنفيذ
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  ready: "picked_up",
  picked_up: "on_the_way",
  on_the_way: "delivered",
};

function money(n: number): string {
  return `${Math.round(n).toLocaleString("fr-DZ")} دج`;
}

function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function openMaps(lat: number, lng: number, label?: string) {
  const q = label ? encodeURIComponent(label) : `${lat},${lng}`;
  const url = Platform.select({
    ios: `maps://?daddr=${lat},${lng}&q=${q}`,
    default: `google.navigation:q=${lat},${lng}`,
  })!;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`),
  );
}

function callPhone(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => Alert.alert("تعذّر الاتّصال", phone));
}

export function DriverOrderScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const queryClient = useQueryClient();
  const mapRef = useRef<MapView>(null);
  const myLoc = useCurrentLocation();
  const insets = useSafeAreaInsets();

  const query = useQuery({
    queryKey: ["driver", "order", orderId],
    queryFn: () => driversApi.orderDetail(orderId),
    refetchInterval: 10_000,
  });

  const me = useQuery({ queryKey: ["driver", "me"], queryFn: driversApi.me });

  const claim = useMutation({
    mutationFn: () => driversApi.claim(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver", "order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["driver", "available"] });
      queryClient.invalidateQueries({ queryKey: ["driver", "my-orders"] });
    },
    onError: (e) => Alert.alert("تعذّر استلام الطلب", (e as Error).message),
  });

  const advance = useMutation({
    mutationFn: (status: OrderStatus) => driversApi.setStatus(orderId, status),
    onSuccess: (o) => {
      queryClient.invalidateQueries({ queryKey: ["driver", "order", orderId] });
      queryClient.invalidateQueries({ queryKey: ["driver", "my-orders"] });
      if (o.status === "delivered") {
        Alert.alert("اكتمل التسليم", "أحسنت! يمكنك استلام طلبٍ جديد", [
          { text: "حسناً", onPress: () => navigation.goBack() },
        ]);
      }
    },
    onError: (e) => Alert.alert("تعذّر التحديث", (e as Error).message),
  });

  if (query.isLoading || !query.data) {
    return (
      <Screen>
        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          <Skeleton width="100%" height={48} radius={radii.lg} />
          <Skeleton width="100%" height={200} radius={radii.lg} />
          <Skeleton width="60%" height={16} />
          <Skeleton width="80%" height={14} />
        </View>
      </Screen>
    );
  }

  const order: DriverOrderDetail = query.data;
  const isMine = me.data && order.driver_id === me.data.id;
  const next = NEXT[order.status];
  const pickup = order.pickup?.location ?? null;
  const dest = order.delivery_location;
  const tripKm = pickup && dest ? distanceKm(pickup, dest) : null;
  const count = order.items.reduce((s, i) => s + i.qty, 0);

  const fitMap = () => {
    const pts = [pickup, dest].filter(Boolean) as { lat: number; lng: number }[];
    if (pts.length >= 2) {
      mapRef.current?.fitToCoordinates(
        pts.map((p) => ({ latitude: p.lat, longitude: p.lng })),
        { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: false },
      );
    }
  };

  const region = dest
    ? { latitude: dest.lat, longitude: dest.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : pickup
    ? { latitude: pickup.lat, longitude: pickup.lng, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : undefined;

  const footerPad = (insets.bottom > 0 ? insets.bottom : spacing.md) + spacing.sm;

  return (
    <Screen padded={false} background="white">
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 132 + footerPad }]}>
        {/* الرأس */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.orderId}>طلب #{order.id.slice(0, 8)}</Text>
            <Text style={styles.orderMeta}>{count} عناصر · {money(Number(order.total))} للتحصيل</Text>
          </View>
          <StatusBadge status={order.status} />
        </View>

        {/* الخريطة */}
        {region ? (
          <View style={styles.mapWrap}>
            <MapView ref={mapRef} style={styles.map} initialRegion={region} onMapReady={fitMap}>
              {pickup ? (
                <Marker
                  coordinate={{ latitude: pickup.lat, longitude: pickup.lng }}
                  title={order.pickup?.name ?? "الاستلام"}
                  description="نقطة الاستلام"
                  pinColor={colors.accent}
                />
              ) : null}
              {dest ? (
                <Marker
                  coordinate={{ latitude: dest.lat, longitude: dest.lng }}
                  title="وجهة التسليم"
                  pinColor={colors.primary}
                />
              ) : null}
              {pickup && dest ? (
                <Polyline
                  coordinates={[
                    { latitude: pickup.lat, longitude: pickup.lng },
                    { latitude: dest.lat, longitude: dest.lng },
                  ]}
                  strokeColor={colors.primary}
                  strokeWidth={3}
                  lineDashPattern={[6, 6]}
                />
              ) : null}
            </MapView>
            {tripKm != null ? (
              <View style={styles.tripBadge}>
                <Icon name="scooter" size={14} color={colors.text} />
                <Text style={styles.tripText}>{tripKm.toFixed(1)} كم للرحلة</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* بطاقة الرحلة: استلام ← تسليم */}
        <View style={styles.journey}>
          <Stop
            tint={colors.accent}
            step="1"
            label="الاستلام من"
            title={order.pickup?.name ?? "المتجر"}
            subtitle={
              pickup && myLoc.location
                ? `${distanceKm(myLoc.location, pickup).toFixed(1)} كم منك`
                : undefined
            }
            phone={order.pickup?.phone ?? null}
            onNavigate={pickup ? () => openMaps(pickup.lat, pickup.lng, order.pickup?.name) : undefined}
            connector
          />
          <Stop
            tint={colors.primary}
            step="2"
            label="التسليم إلى"
            title={order.customer?.name || "الزبون"}
            subtitle={order.delivery_details ?? undefined}
            phone={order.customer?.phone ?? null}
            onNavigate={dest ? () => openMaps(dest.lat, dest.lng) : undefined}
          />
        </View>

        {/* المنتجات */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>المنتجات ({count})</Text>
          <View style={styles.card}>
            {order.items.map((i, idx) => (
              <View key={i.id} style={[styles.itemRow, idx > 0 && styles.itemRowBordered]}>
                <View style={styles.qtyChip}>
                  <Text style={styles.qtyText}>{i.qty}</Text>
                </View>
                <Text style={styles.itemName} numberOfLines={1}>{i.product_name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* الملخّص المالي */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>الملخّص المالي</Text>
          <View style={styles.card}>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>قيمة الطلب</Text>
              <PriceTag amount={Number(order.subtotal)} size="sm" muted />
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>رسوم التوصيل</Text>
              <PriceTag amount={Number(order.delivery_fee)} size="sm" muted />
            </View>
            <View style={styles.divider} />
            <View style={styles.sumRow}>
              <Text style={[styles.sumLabel, styles.bold]}>الإجمالي يُحصَّل نقداً</Text>
              <PriceTag amount={Number(order.total)} size="md" />
            </View>
            <View style={[styles.payChip, order.payment_method === "cash" ? styles.payCash : styles.payCard]}>
              <Icon
                name={order.payment_method === "cash" ? "cash" : "card"}
                size={14}
                color={order.payment_method === "cash" ? colors.success : colors.info}
              />
              <Text style={[styles.payChipText, { color: order.payment_method === "cash" ? colors.success : colors.info }]}>
                {order.payment_method === "cash" ? "دفع نقداً عند التسليم" : "مدفوع بالبطاقة"}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* شريط الإجراء السفلي — يراعي safe-area */}
      <View style={[styles.footer, { paddingBottom: footerPad }]}>
        <View style={styles.earnRow}>
          <Text style={styles.earnLabel}>أجرتك من هذه التوصيلة</Text>
          <Text style={styles.earnValue}>{money(Number(order.delivery_fee))}</Text>
        </View>
        {!order.driver_id ? (
          <Button label="استلام الطلب" onPress={() => claim.mutate()} loading={claim.isPending} style={styles.actionBtnMain} />
        ) : isMine && next ? (
          <Button label={statusLabel(next)} onPress={() => advance.mutate(next)} loading={advance.isPending} style={styles.actionBtnMain} />
        ) : isMine ? (
          <View style={styles.donePill}>
            <Icon name="check" size={18} color={colors.success} />
            <Text style={styles.doneTxt}>اكتمل التسليم</Text>
          </View>
        ) : (
          <Text style={styles.takenTxt}>هذا الطلب مُسنَد لسائق آخر</Text>
        )}
      </View>
    </Screen>
  );
}

function Stop({
  tint,
  step,
  label,
  title,
  subtitle,
  phone,
  onNavigate,
  connector,
}: {
  tint: string;
  step: string;
  label: string;
  title: string;
  subtitle?: string;
  phone: string | null;
  onNavigate?: () => void;
  connector?: boolean;
}) {
  return (
    <View style={styles.stop}>
      <View style={styles.stepCol}>
        <View style={[styles.stepDot, { backgroundColor: tint }]}>
          <Text style={styles.stepText}>{step}</Text>
        </View>
        {connector ? <View style={styles.connector} /> : null}
      </View>
      <View style={styles.stopBody}>
        <Text style={styles.stopLabel}>{label}</Text>
        <Text style={styles.stopTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.stopSub} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      <View style={styles.stopActions}>
        {phone ? (
          <Pressable style={[styles.actionCircle, { backgroundColor: colors.successSoft }]} onPress={() => callPhone(phone)}>
            <Icon name="phone" size={18} color={colors.success} />
          </Pressable>
        ) : null}
        {onNavigate ? (
          <Pressable style={[styles.actionCircle, { backgroundColor: tint + "1A" }]} onPress={onNavigate}>
            <Icon name="navigation" size={18} color={tint} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingTop: spacing.xs },

  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  orderId: { fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  orderMeta: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },

  mapWrap: { height: 220, marginHorizontal: spacing.lg, borderRadius: radii.xl, overflow: "hidden", ...shadows.sm },
  map: { flex: 1 },
  tripBadge: {
    position: "absolute",
    bottom: spacing.sm,
    insetInlineEnd: spacing.sm,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.pill,
    ...shadows.sm,
  },
  tripText: { fontSize: fontSize.caption + 1, fontWeight: fontWeight.bold, color: colors.text },

  // بطاقة الرحلة
  journey: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.sm,
  },
  stop: { flexDirection: "row-reverse", alignItems: "stretch", gap: spacing.md },
  stepCol: { width: 30, alignItems: "center" },
  stepDot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  stepText: { color: "#fff", fontWeight: fontWeight.extrabold, fontSize: fontSize.small },
  connector: { flex: 1, width: 2, backgroundColor: colors.border, marginVertical: 4, borderRadius: 1 },
  stopBody: { flex: 1, paddingBottom: spacing.lg },
  stopLabel: { fontSize: fontSize.caption + 1, color: colors.textMuted, textAlign: "right" },
  stopTitle: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right", marginTop: 1 },
  stopSub: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  stopActions: { flexDirection: "row-reverse", gap: spacing.sm, alignItems: "center" },
  actionCircle: { width: 42, height: 42, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },

  // كتل
  block: { paddingHorizontal: spacing.lg, marginTop: spacing.lg, gap: spacing.sm },
  blockTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  card: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    ...shadows.sm,
  },

  itemRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, paddingVertical: spacing.sm },
  itemRowBordered: { borderTopWidth: 1, borderTopColor: colors.divider },
  qtyChip: { minWidth: 30, height: 26, paddingHorizontal: spacing.xs, borderRadius: radii.sm, backgroundColor: colors.accent + "14", alignItems: "center", justifyContent: "center" },
  qtyText: { fontSize: fontSize.small, fontWeight: fontWeight.extrabold, color: colors.accent },
  itemName: { flex: 1, fontSize: fontSize.body, color: colors.text, textAlign: "right" },

  sumRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs },
  sumLabel: { color: colors.textMuted, fontSize: fontSize.small + 1 },
  bold: { fontWeight: fontWeight.extrabold, color: colors.text },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.xs + 2 },
  payChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: spacing.xs,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.pill,
  },
  payCash: { backgroundColor: colors.successSoft },
  payCard: { backgroundColor: colors.infoSoft },
  payChipText: { fontSize: fontSize.caption + 1, fontWeight: fontWeight.bold },

  // الشريط السفلي
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    gap: spacing.sm,
    ...shadows.lg,
  },
  earnRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  earnLabel: { fontSize: fontSize.small, color: colors.textMuted, fontWeight: fontWeight.medium },
  earnValue: { fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, color: colors.accent },
  actionBtnMain: { backgroundColor: colors.accent },
  donePill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 50,
    borderRadius: radii.lg,
    backgroundColor: colors.successSoft,
  },
  doneTxt: { color: colors.success, fontWeight: fontWeight.extrabold, fontSize: fontSize.bodyLg },
  takenTxt: { textAlign: "center", color: colors.textMuted, fontSize: fontSize.small + 1, paddingVertical: spacing.md },
});
