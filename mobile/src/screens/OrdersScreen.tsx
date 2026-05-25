import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { ordersApi } from "../api/orders";
import type { Order } from "../api/types";
import { Screen } from "../components/Screen";
import { StatusBadge } from "../components/StatusBadge";
import { colors } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "OrdersTab">,
  NativeStackScreenProps<AppStackParamList>
>;

export function OrdersScreen({ navigation }: Props) {
  const query = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersApi.list(),
    // تحديث دوري كل 30 ثانية لمواكبة تغيّر حالة الطلبات
    refetchInterval: 30_000,
  });

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>طلباتي</Text>
      </View>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={() => query.refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !query.isLoading ? (
            <Text style={styles.empty}>لا توجد طلبات بعد</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <OrderCard
            order={item}
            onPress={() => navigation.navigate("OrderTracking", { orderId: item.id })}
          />
        )}
      />
    </Screen>
  );
}

function OrderCard({ order, onPress }: { order: Order; onPress: () => void }) {
  const itemsSummary = order.items
    .slice(0, 2)
    .map((i) => `${i.qty}× ${i.product_name}`)
    .join("، ");
  const extra = order.items.length > 2 ? ` +${order.items.length - 2}` : "";
  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
        <StatusBadge status={order.status} />
      </View>
      <Text style={styles.items} numberOfLines={2}>{itemsSummary}{extra}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.total}>{Number(order.total).toFixed(0)} دج</Text>
        <Text style={styles.date}>{new Date(order.created_at).toLocaleString("ar-DZ")}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { padding: 16 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "right" },
  list: { paddingHorizontal: 16, paddingBottom: 24 },
  card: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: 8,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  items: { fontSize: 14, color: colors.text, textAlign: "right" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  total: { fontSize: 15, fontWeight: "700", color: colors.primary },
  date: { fontSize: 12, color: colors.textMuted },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 60 },
});
