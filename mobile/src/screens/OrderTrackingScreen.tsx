import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { ordersApi } from "../api/orders";
import type { Order, OrderStatus } from "../api/types";
import { RatingCard } from "../components/RatingCard";
import { Screen } from "../components/Screen";
import { StatusBadge, statusLabel } from "../components/StatusBadge";
import { useOrderTracking } from "../hooks/useOrderTracking";
import { colors } from "../theme/colors";
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

export function OrderTrackingScreen({ route }: Props) {
  const { orderId } = route.params;
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
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  const order: Order = query.data;
  const status: OrderStatus = live.status ?? order.status;
  const dest = order.delivery_location;
  const driver = live.driverLocation;
  const hasMap = Boolean(dest);

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerCard}>
          <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
          <StatusBadge status={status} />
          <Text style={styles.liveDot}>
            {live.connected ? "● بثّ مباشر" : "○ غير متّصل"}
          </Text>
        </View>

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
                title="وجهة التسليم"
                pinColor={colors.primary}
              />
              {driver ? (
                <Marker
                  coordinate={{ latitude: driver.lat, longitude: driver.lng }}
                  title="السائق"
                  pinColor={colors.accent}
                />
              ) : null}
            </MapView>
          </View>
        ) : null}

        <View style={styles.timeline}>
          <Text style={styles.section}>تقدّم الطلب</Text>
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
                  {statusLabel(s)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.summary}>
          <Text style={styles.section}>تفاصيل الطلب</Text>
          {order.items.map((i) => (
            <View key={i.id} style={styles.sumRow}>
              <Text style={styles.sumLabel}>{i.qty}× {i.product_name}</Text>
              <Text style={styles.sumValue}>
                {(Number(i.unit_price) * i.qty).toFixed(0)} دج
              </Text>
            </View>
          ))}
          <View style={styles.divider} />
          <SumRow label="المجموع الفرعي" value={`${Number(order.subtotal).toFixed(0)} دج`} />
          <SumRow label="رسوم التوصيل" value={`${Number(order.delivery_fee).toFixed(0)} دج`} />
          <SumRow
            label="الإجمالي"
            value={`${Number(order.total).toFixed(0)} دج`}
            bold
          />
          <Text style={styles.payNote}>
            الدفع: {order.payment_method === "cash" ? "نقداً عند الاستلام" : "بطاقة"}
          </Text>
        </View>

        {status === "delivered" ? <RatingCard orderId={order.id} /> : null}
      </ScrollView>
    </Screen>
  );
}

function SumRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={styles.sumRow}>
      <Text style={[styles.sumLabel, bold && styles.bold]}>{label}</Text>
      <Text style={[styles.sumValue, bold && styles.bold]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingBottom: 24 },
  headerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: colors.surface,
    gap: 8,
  },
  orderId: { fontSize: 14, fontWeight: "700", color: colors.text },
  liveDot: { fontSize: 11, color: colors.textMuted },
  mapWrap: { height: 260, margin: 16, borderRadius: 12, overflow: "hidden" },
  map: { flex: 1 },
  timeline: { padding: 16 },
  section: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 10, textAlign: "right" },
  tlRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  tlDot: { width: 12, height: 12, borderRadius: 6 },
  tlLabel: { fontSize: 14 },
  summary: { padding: 16, gap: 4 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  sumLabel: { color: colors.textMuted, fontSize: 14 },
  sumValue: { color: colors.text, fontSize: 14 },
  bold: { fontWeight: "800", color: colors.text },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },
  payNote: { fontSize: 12, color: colors.textMuted, marginTop: 6, textAlign: "right" },
});
