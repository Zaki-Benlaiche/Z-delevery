import {
  ActivityIndicator,
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
import { StatusBadge, statusLabel } from "../../components/StatusBadge";
import { colors } from "../../theme/colors";
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
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
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
        <View style={styles.headerCard}>
          <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
          <StatusBadge status={order.status} />
        </View>

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
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>قيمة الطلب</Text>
            <Text style={styles.sumValue}>{Number(order.subtotal).toFixed(0)} دج</Text>
          </View>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>التوصيل</Text>
            <Text style={styles.sumValue}>{Number(order.delivery_fee).toFixed(0)} دج</Text>
          </View>
          <View style={[styles.sumRow, { borderTopWidth: 1, borderColor: colors.border, paddingTop: 8, marginTop: 4 }]}>
            <Text style={[styles.sumLabel, styles.bold]}>الإجمالي يُحصَّل</Text>
            <Text style={[styles.sumValue, styles.bold]}>{Number(order.total).toFixed(0)} دج</Text>
          </View>
          <Text style={styles.payNote}>
            {order.payment_method === "cash" ? "دفع نقداً عند الاستلام" : "دفع بطاقة"}
          </Text>
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
    padding: 16,
    backgroundColor: colors.surface,
  },
  orderId: { fontSize: 14, fontWeight: "700", color: colors.text },
  mapWrap: { height: 220, margin: 16, borderRadius: 12, overflow: "hidden" },
  map: { flex: 1 },
  section: { padding: 16, gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 6, textAlign: "right" },
  address: { fontSize: 14, color: colors.text, textAlign: "right" },
  itemRow: { flexDirection: "row", gap: 10, paddingVertical: 4, alignItems: "center" },
  itemQty: { fontSize: 14, fontWeight: "700", color: colors.primary, minWidth: 32 },
  itemName: { fontSize: 14, color: colors.text, flex: 1, textAlign: "right" },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  sumLabel: { color: colors.textMuted, fontSize: 14 },
  sumValue: { color: colors.text, fontSize: 14 },
  bold: { fontWeight: "800" },
  payNote: { fontSize: 12, color: colors.textMuted, marginTop: 6, textAlign: "right" },
  footer: { position: "absolute", left: 16, right: 16, bottom: 16 },
  doneTxt: { textAlign: "center", color: colors.success, fontWeight: "700", fontSize: 16 },
  takenTxt: { textAlign: "center", color: colors.textMuted, fontSize: 14 },
});
