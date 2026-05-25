import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { driversApi, type Driver } from "../../api/drivers";
import { ordersApi } from "../../api/orders";
import type { Order } from "../../api/types";
import { Screen } from "../../components/Screen";
import { useCurrentLocation } from "../../hooks/useLocation";
import { useDriverLocationSender } from "../../hooks/useDriverLocationSender";
import { colors } from "../../theme/colors";
import type { DriverStackParamList, DriverTabParamList } from "../../navigation/types";
import { DriverRegisterScreen } from "./DriverRegisterScreen";

type Props = CompositeScreenProps<
  BottomTabScreenProps<DriverTabParamList, "DriverHomeTab">,
  NativeStackScreenProps<DriverStackParamList>
>;

export function DriverHomeScreen({ navigation }: Props) {
  const loc = useCurrentLocation();

  const me = useQuery({
    queryKey: ["driver", "me"],
    queryFn: driversApi.me,
    retry: false,
  });

  // إن لم يكن لدى المستخدم ملف سائق بعد، نعرض شاشة التسجيل
  if (me.isLoading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </Screen>
    );
  }
  if (me.error || !me.data) {
    return <DriverRegisterScreen />;
  }

  return <DriverHomeContent driver={me.data} navigation={navigation} userLat={loc.location?.lat} userLng={loc.location?.lng} />;
}

interface ContentProps {
  driver: Driver;
  navigation: Props["navigation"];
  userLat?: number;
  userLng?: number;
}

function DriverHomeContent({ driver, navigation, userLat, userLng }: ContentProps) {
  const queryClient = useQueryClient();

  const toggleOnline = useMutation({
    mutationFn: (online: boolean) => driversApi.setOnline(online),
    onSuccess: (d) =>
      queryClient.setQueryData(["driver", "me"], d),
    onError: (e) => Alert.alert("تعذّر التبديل", (e as Error).message),
  });

  const available = useQuery({
    queryKey: ["driver", "available", userLat, userLng],
    queryFn: () => driversApi.availableOrders(userLat, userLng),
    enabled: driver.is_online,
    refetchInterval: driver.is_online ? 15_000 : false,
  });

  const myActive = useQuery({
    queryKey: ["driver", "my-orders"],
    queryFn: () => ordersApi.list(),
    refetchInterval: 20_000,
  });

  const activeOrders = (myActive.data ?? []).filter((o) =>
    ["accepted", "preparing", "ready", "picked_up", "on_the_way"].includes(o.status),
  );

  // أرسل الموقع دورياً عندما يكون السائق متّصلاً أو لديه طلب نشِط
  useDriverLocationSender(driver.is_online || activeOrders.length > 0);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>مرحباً</Text>
          <Text style={styles.statusTxt}>
            {driver.is_online ? "🟢 متّصل ومستعدّ" : "⚫ غير متّصل"}
          </Text>
        </View>
        <Switch
          value={driver.is_online}
          onValueChange={(v) => toggleOnline.mutate(v)}
          trackColor={{ true: colors.primary, false: colors.border }}
          thumbColor="#fff"
        />
      </View>

      <FlatList
        ListHeaderComponent={
          <>
            {activeOrders.length > 0 ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>طلباتك النشِطة</Text>
                {activeOrders.map((o) => (
                  <OrderRow
                    key={o.id}
                    order={o}
                    accent
                    onPress={() => navigation.navigate("DriverOrder", { orderId: o.id })}
                  />
                ))}
              </View>
            ) : null}

            <View style={[styles.section, { marginTop: activeOrders.length ? 24 : 0 }]}>
              <Text style={styles.sectionTitle}>
                {driver.is_online ? "طلبات متاحة قربك" : "فعّل الاتّصال لرؤية الطلبات"}
              </Text>
            </View>
          </>
        }
        data={driver.is_online ? available.data ?? [] : []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl
            refreshing={available.isFetching && !available.isLoading}
            onRefresh={() => available.refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          driver.is_online && !available.isLoading ? (
            <Text style={styles.empty}>لا توجد طلبات متاحة حالياً — تابع الانتظار</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <OrderRow
            order={item}
            onPress={() => navigation.navigate("DriverOrder", { orderId: item.id })}
          />
        )}
      />
    </Screen>
  );
}

function OrderRow({
  order,
  onPress,
  accent,
}: {
  order: Order;
  onPress: () => void;
  accent?: boolean;
}) {
  const itemsCount = order.items.reduce((sum, i) => sum + i.qty, 0);
  return (
    <Pressable
      style={[styles.row, accent && styles.rowAccent]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>طلب #{order.id.slice(0, 8)}</Text>
        <Text style={styles.rowMeta}>
          {itemsCount} عنصراً · {Number(order.total).toFixed(0)} دج
        </Text>
        {order.delivery_details ? (
          <Text style={styles.rowMeta} numberOfLines={1}>📍 {order.delivery_details}</Text>
        ) : null}
      </View>
      <Text style={styles.arrow}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingTop: 12,
    backgroundColor: colors.surface,
  },
  greeting: { fontSize: 14, color: colors.textMuted, textAlign: "right" },
  statusTxt: { fontSize: 18, fontWeight: "700", color: colors.text, textAlign: "right" },
  section: { paddingHorizontal: 16, paddingTop: 12 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
    marginBottom: 8,
  },
  list: { paddingBottom: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    marginHorizontal: 16,
    gap: 10,
  },
  rowAccent: { borderColor: colors.primary, backgroundColor: "#FFF7F0" },
  rowTitle: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "right" },
  rowMeta: { fontSize: 13, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  arrow: { color: colors.textMuted, fontSize: 24, fontWeight: "300" },
  empty: { textAlign: "center", color: colors.textMuted, paddingHorizontal: 16, marginTop: 24 },
});
