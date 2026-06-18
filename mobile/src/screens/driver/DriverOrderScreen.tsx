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
import MapView, { Marker, Polyline } from "react-native-maps";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { driversApi, type DriverOrderDetail } from "../../api/drivers";
import type { OrderStatus } from "../../api/types";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { PriceTag } from "../../components/PriceTag";
import { Skeleton } from "../../components/Skeleton";
import { Icon } from "../../components/Icon";
import { StatusBadge, statusLabel } from "../../components/StatusBadge";
import { useCurrentLocation } from "../../hooks/useLocation";
import { colors, fontSize, fontWeight, radii, spacing } from "../../theme/colors";
import type { DriverStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<DriverStackParamList, "DriverOrder">;

// الانتقالات المتاحة للسائق على ترتيب التنفيذ
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  ready: "picked_up",
  picked_up: "on_the_way",
  on_the_way: "delivered",
};

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

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card variant="soft" padding="md" style={styles.headerCard}>
          <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
          <StatusBadge status={order.status} />
        </Card>

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

        {/* نقطة الاستلام */}
        <RouteCard
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
        />

        {/* وجهة التسليم */}
        <RouteCard
          tint={colors.primary}
          step="2"
          label="التسليم إلى"
          title={order.customer?.name || "الزبون"}
          subtitle={order.delivery_details ?? undefined}
          phone={order.customer?.phone ?? null}
          onNavigate={dest ? () => openMaps(dest.lat, dest.lng) : undefined}
        />

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>المنتجات</Text>
          {order.items.map((i) => (
            <View key={i.id} style={styles.itemRow}>
              <Text style={styles.itemQty}>×{i.qty}</Text>
              <Text style={styles.itemName}>{i.product_name}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Card variant="outlined" padding="md" style={{ gap: spacing.xs }}>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>قيمة الطلب</Text>
              <PriceTag amount={Number(order.subtotal)} size="sm" muted />
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>التوصيل</Text>
              <PriceTag amount={Number(order.delivery_fee)} size="sm" muted />
            </View>
            <View style={styles.divider} />
            <View style={styles.sumRow}>
              <Text style={[styles.sumLabel, styles.bold]}>الإجمالي يُحصَّل</Text>
              <PriceTag amount={Number(order.total)} size="md" />
            </View>
            <Text style={styles.payNote}>
              {order.payment_method === "cash" ? "دفع نقداً عند الاستلام" : "دفع بطاقة"}
            </Text>
          </Card>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {!order.driver_id ? (
          <Button label="استلام الطلب" onPress={() => claim.mutate()} loading={claim.isPending} />
        ) : isMine && next ? (
          <Button label={statusLabel(next)} onPress={() => advance.mutate(next)} loading={advance.isPending} />
        ) : isMine ? (
          <Text style={styles.doneTxt}>اكتمل ✓</Text>
        ) : (
          <Text style={styles.takenTxt}>هذا الطلب مُسنَد لسائق آخر</Text>
        )}
      </View>
    </Screen>
  );
}

function RouteCard({
  tint,
  step,
  label,
  title,
  subtitle,
  phone,
  onNavigate,
}: {
  tint: string;
  step: string;
  label: string;
  title: string;
  subtitle?: string;
  phone: string | null;
  onNavigate?: () => void;
}) {
  return (
    <View style={styles.routeCard}>
      <View style={[styles.stepDot, { backgroundColor: tint }]}>
        <Text style={styles.stepText}>{step}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.routeLabel}>{label}</Text>
        <Text style={styles.routeTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.routeSub} numberOfLines={2}>{subtitle}</Text> : null}
      </View>
      <View style={styles.routeActions}>
        {phone ? (
          <Pressable style={[styles.actionBtn, { backgroundColor: colors.successSoft }]} onPress={() => callPhone(phone)}>
            <Icon name="phone" size={18} color={colors.success} />
          </Pressable>
        ) : null}
        {onNavigate ? (
          <Pressable style={[styles.actionBtn, { backgroundColor: colors.primarySoft }]} onPress={onNavigate}>
            <Icon name="navigation" size={18} color={colors.primary} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 100 },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    margin: spacing.lg,
    marginBottom: 0,
  },
  orderId: { fontSize: fontSize.small + 1, fontWeight: fontWeight.bold, color: colors.text },
  mapWrap: { height: 220, margin: spacing.lg, borderRadius: radii.lg, overflow: "hidden" },
  map: { flex: 1 },
  tripBadge: {
    position: "absolute",
    bottom: spacing.sm,
    insetInlineEnd: spacing.sm,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  tripText: { fontSize: fontSize.caption + 1, fontWeight: fontWeight.bold, color: colors.text },

  routeCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  stepDot: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  stepText: { color: "#fff", fontWeight: fontWeight.extrabold, fontSize: fontSize.small },
  routeLabel: { fontSize: fontSize.caption, color: colors.textMuted, textAlign: "right" },
  routeTitle: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  routeSub: { fontSize: fontSize.caption + 1, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  routeActions: { flexDirection: "row-reverse", gap: spacing.sm },
  actionBtn: { width: 40, height: 40, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },

  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xs + 2 },
  sectionTitle: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs + 2, textAlign: "right" },
  itemRow: { flexDirection: "row", gap: spacing.sm + 2, paddingVertical: spacing.xs, alignItems: "center" },
  itemQty: { fontSize: fontSize.small + 1, fontWeight: fontWeight.bold, color: colors.primary, minWidth: 32 },
  itemName: { fontSize: fontSize.small + 1, color: colors.text, flex: 1, textAlign: "right" },
  sumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: spacing.xs },
  sumLabel: { color: colors.textMuted, fontSize: fontSize.small + 1 },
  bold: { fontWeight: fontWeight.extrabold, color: colors.text },
  divider: { height: 1, backgroundColor: colors.divider, marginVertical: spacing.xs + 2 },
  payNote: { fontSize: fontSize.caption + 1, color: colors.textMuted, marginTop: spacing.xs + 2, textAlign: "right" },
  footer: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg },
  doneTxt: { textAlign: "center", color: colors.success, fontWeight: fontWeight.bold, fontSize: fontSize.bodyLg },
  takenTxt: { textAlign: "center", color: colors.textMuted, fontSize: fontSize.small + 1 },
});
