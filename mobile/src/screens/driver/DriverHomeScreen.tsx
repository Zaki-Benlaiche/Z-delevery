import {
  Alert,
  FlatList,
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
import { Card } from "../../components/Card";
import { EmptyState } from "../../components/EmptyState";
import { PriceTag } from "../../components/PriceTag";
import { Skeleton } from "../../components/Skeleton";
import { useCurrentLocation } from "../../hooks/useLocation";
import { useDriverLocationSender } from "../../hooks/useDriverLocationSender";
import { colors, fontSize, fontWeight, radii, spacing } from "../../theme/colors";
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
        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} width="100%" height={72} radius={radii.lg} />
          ))}
        </View>
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
      {!driver.is_verified ? (
        <View style={styles.pendingBanner}>
          <Text style={styles.pendingTitle}>⏳ بانتظار توثيق الإدارة</Text>
          <Text style={styles.pendingText}>
            حسابك مُسجّل وستتمكّن من قبول الطلبات فور موافقة الإدارة على مستنداتك.
          </Text>
        </View>
      ) : null}

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
          disabled={!driver.is_verified}
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
                  <View key={o.id} style={{ marginBottom: spacing.sm + 2 }}>
                    <OrderRow
                      order={o}
                      accent
                      onPress={() => navigation.navigate("DriverOrder", { orderId: o.id })}
                    />
                  </View>
                ))}
              </View>
            ) : null}

            <View style={[styles.section, { marginTop: activeOrders.length ? spacing.xxl : 0 }]}>
              <Text style={styles.sectionTitle}>
                {driver.is_online ? "طلبات متاحة قربك" : "فعّل الاتّصال لرؤية الطلبات"}
              </Text>
            </View>
          </>
        }
        data={driver.is_online ? available.data ?? [] : []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm + 2 }} />}
        refreshControl={
          <RefreshControl
            refreshing={available.isFetching && !available.isLoading}
            onRefresh={() => available.refetch()}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          driver.is_online && !available.isLoading ? (
            <EmptyState icon="🛵" title="لا توجد طلبات متاحة" hint="تابع الانتظار — ستصلك الطلبات القريبة هنا" />
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
    <Card
      variant="outlined"
      padding="sm"
      onPress={onPress}
      style={accent ? { ...styles.row, ...styles.rowAccent } : styles.row}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>طلب #{order.id.slice(0, 8)}</Text>
        <View style={styles.metaLine}>
          <Text style={styles.rowMeta}>{itemsCount} عنصراً ·</Text>
          <PriceTag amount={Number(order.total)} size="sm" muted />
        </View>
        {order.delivery_details ? (
          <Text style={styles.rowMeta} numberOfLines={1}>📍 {order.delivery_details}</Text>
        ) : null}
      </View>
      <Text style={styles.arrow}>‹</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
  },
  greeting: { fontSize: fontSize.small + 1, color: colors.textMuted, textAlign: "right" },
  statusTxt: { fontSize: fontSize.h4, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  sectionTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "right",
    marginBottom: spacing.sm,
  },
  list: { paddingBottom: spacing.xxl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    gap: spacing.sm + 2,
  },
  rowAccent: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  rowTitle: { fontSize: fontSize.small + 1, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  metaLine: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs, marginTop: 2, justifyContent: "flex-end" },
  rowMeta: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  arrow: { color: colors.textMuted, fontSize: 24, fontWeight: "300" },
  pendingBanner: {
    backgroundColor: colors.warningSoft,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderRadius: radii.lg,
    borderStartWidth: 4,
    borderStartColor: colors.warning,
  },
  pendingTitle: { fontSize: fontSize.small + 1, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  pendingText: { fontSize: fontSize.small, color: colors.text, textAlign: "right", marginTop: spacing.xs, lineHeight: 18 },
});
