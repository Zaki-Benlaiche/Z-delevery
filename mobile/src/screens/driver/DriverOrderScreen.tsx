import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { driversApi } from "../../api/drivers";
import { ordersApi } from "../../api/orders";
import type { Order, OrderStatus } from "../../api/types";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { PriceTag } from "../../components/PriceTag";
import { Skeleton } from "../../components/Skeleton";
import { StatusBadge, statusLabel } from "../../components/StatusBadge";
import { colors, fontSize, fontWeight, radii, spacing } from "../../theme/colors";
import type { DriverStackParamList } from "../../navigation/types";

type Props = NativeStackScreenProps<DriverStackParamList, "DriverOrder">;

// الانتقالات المتاحة للسائق على ترتيب التنفيذ
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = {
  ready: "picked_up",
  picked_up: "on_the_way",
  on_the_way: "delivered",
};

export function DriverOrderScreen({ route, navigation }: Props) {
  const { orderId } = route.params;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => ordersApi.detail(orderId),
    refetchInterval: 10_000,
  });

  const me = useQuery({ queryKey: ["driver", "me"], queryFn: driversApi.me });

  const claim = useMutation({
    mutationFn: () => driversApi.claim(orderId),
    onSuccess: (o) => {
      queryClient.setQueryData(["order", orderId], o);
      queryClient.invalidateQueries({ queryKey: ["driver", "available"] });
      queryClient.invalidateQueries({ queryKey: ["driver", "my-orders"] });
    },
    onError: (e) => Alert.alert("تعذّر استلام الطلب", (e as Error).message),
  });

  const advance = useMutation({
    mutationFn: (status: OrderStatus) => driversApi.setStatus(orderId, status),
    onSuccess: (o) => {
      queryClient.setQueryData(["order", orderId], o);
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

  const order: Order = query.data;
  const isMine = me.data && order.driver_id === me.data.id;
  const next = NEXT[order.status];
  const dest = order.delivery_location;

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Card variant="soft" padding="md" style={styles.headerCard}>
          <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
          <StatusBadge status={order.status} />
        </Card>

        {dest ? (
          <View style={styles.mapWrap}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: dest.lat,
                longitude: dest.lng,
                latitudeDelta: 0.02,
                longitudeDelta: 0.02,
              }}
            >
              <Marker
                coordinate={{ latitude: dest.lat, longitude: dest.lng }}
                title="وجهة التسليم"
                pinColor={colors.primary}
              />
            </MapView>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>عنوان التسليم</Text>
          <Text style={styles.address}>{order.delivery_details ?? "—"}</Text>
        </View>

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
          <Button
            label="استلام الطلب"
            onPress={() => claim.mutate()}
            loading={claim.isPending}
          />
        ) : isMine && next ? (
          <Button
            label={statusLabel(next)}
            onPress={() => advance.mutate(next)}
            loading={advance.isPending}
          />
        ) : isMine ? (
          <Text style={styles.doneTxt}>اكتمل ✓</Text>
        ) : (
          <Text style={styles.takenTxt}>هذا الطلب مُسنَد لسائق آخر</Text>
        )}
      </View>
    </Screen>
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
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xs + 2 },
  sectionTitle: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold, color: colors.text, marginBottom: spacing.xs + 2, textAlign: "right" },
  address: { fontSize: fontSize.small + 1, color: colors.text, textAlign: "right" },
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
