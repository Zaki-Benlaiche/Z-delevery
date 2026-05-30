import { FlatList, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { ordersApi } from "../api/orders";
import type { Order } from "../api/types";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PriceTag } from "../components/PriceTag";
import { StatusBadge } from "../components/StatusBadge";
import { colors, fontSize, fontWeight, spacing } from "../theme/colors";
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
    placeholderData: (prev) => prev,
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
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm + 2 }} />}
        refreshControl={
          <RefreshControl
            refreshing={query.isFetching && !query.isLoading}
            onRefresh={() => query.refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          !query.isLoading ? (
            <EmptyState icon="🧾" title="لا توجد طلبات بعد" hint="طلباتك ستظهر هنا بعد أوّل طلب" />
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
    <Card variant="elevated" padding="sm" onPress={onPress} style={{ gap: spacing.sm }}>
      <View style={styles.cardHeader}>
        <Text style={styles.orderId}>#{order.id.slice(0, 8)}</Text>
        <StatusBadge status={order.status} />
      </View>
      <Text style={styles.items} numberOfLines={2}>{itemsSummary}{extra}</Text>
      <View style={styles.cardFooter}>
        <PriceTag amount={Number(order.total)} size="md" />
        <Text style={styles.date}>{new Date(order.created_at).toLocaleString("ar-DZ")}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.lg },
  title: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  orderId: { fontSize: fontSize.small, color: colors.textMuted, fontWeight: fontWeight.semibold },
  items: { fontSize: fontSize.small + 1, color: colors.text, textAlign: "right" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  date: { fontSize: fontSize.caption + 1, color: colors.textMuted },
});
