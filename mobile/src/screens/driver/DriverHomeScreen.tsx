import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { driversApi, type Driver } from "../../api/drivers";
import { ordersApi } from "../../api/orders";
import type { Order } from "../../api/types";
import { Screen } from "../../components/Screen";
import { EmptyState } from "../../components/EmptyState";
import { PriceTag } from "../../components/PriceTag";
import { Skeleton } from "../../components/Skeleton";
import { Icon } from "../../components/Icon";
import { useCurrentLocation } from "../../hooks/useLocation";
import { useDriverLocationSender } from "../../hooks/useDriverLocationSender";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../../theme/colors";
import type { DriverStackParamList, DriverTabParamList } from "../../navigation/types";
import { DriverRegisterScreen } from "./DriverRegisterScreen";

type Props = CompositeScreenProps<
  BottomTabScreenProps<DriverTabParamList, "DriverHomeTab">,
  NativeStackScreenProps<DriverStackParamList>
>;

const VEHICLE: Record<string, string> = { moto: "دراجة نارية", car: "سيّارة", bike: "دراجة هوائية" };

export function DriverHomeScreen({ navigation }: Props) {
  const loc = useCurrentLocation();
  const me = useQuery({ queryKey: ["driver", "me"], queryFn: driversApi.me, retry: false });

  if (me.isLoading) {
    return (
      <Screen>
        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} width="100%" height={80} radius={radii.lg} />)}
        </View>
      </Screen>
    );
  }
  if (me.error || !me.data) return <DriverRegisterScreen />;

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
    onSuccess: (d) => queryClient.setQueryData(["driver", "me"], d),
    onError: (e) => Alert.alert("تعذّر التبديل", (e as Error).message),
  });

  const available = useQuery({
    queryKey: ["driver", "available", userLat, userLng],
    queryFn: () => driversApi.availableOrders(userLat, userLng),
    enabled: driver.is_online,
    refetchInterval: driver.is_online ? 12_000 : false,
  });

  const myActive = useQuery({
    queryKey: ["driver", "my-orders"],
    queryFn: () => ordersApi.list(),
    refetchInterval: 20_000,
  });

  const activeOrders = (myActive.data ?? []).filter((o) =>
    ["accepted", "preparing", "ready", "picked_up", "on_the_way"].includes(o.status),
  );

  useDriverLocationSender(driver.is_online || activeOrders.length > 0);

  return (
    <Screen padded={false}>
      {/* بطاقة الحالة */}
      <View style={[styles.statusCard, driver.is_online && styles.statusCardOn]}>
        <View style={styles.statusAvatar}>
          <Icon name="scooter" size={28} color={driver.is_online ? "#fff" : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusTitle, driver.is_online && { color: "#fff" }]}>
            {driver.is_online ? "متّصل ومستعدّ للعمل" : "غير متّصل"}
          </Text>
          <Text style={[styles.statusSub, driver.is_online && { color: "rgba(255,255,255,0.85)" }]}>
            {VEHICLE[driver.vehicle_type] ?? driver.vehicle_type} · ⭐ {Number(driver.rating || 0).toFixed(1)}
          </Text>
        </View>
        <Switch
          value={driver.is_online}
          onValueChange={(v) => toggleOnline.mutate(v)}
          trackColor={{ true: "rgba(255,255,255,0.4)", false: colors.border }}
          thumbColor="#fff"
        />
      </View>

      <FlatList
        data={driver.is_online ? available.data ?? [] : []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={
          <>
            {activeOrders.length > 0 ? (
              <View style={{ marginBottom: spacing.lg }}>
                <Text style={styles.sectionTitle}>طلباتك الجارية ({activeOrders.length})</Text>
                {activeOrders.map((o) => (
                  <View key={o.id} style={{ marginBottom: spacing.md }}>
                    <OrderCard order={o} accent onPress={() => navigation.navigate("DriverOrder", { orderId: o.id })} />
                  </View>
                ))}
              </View>
            ) : null}
            <Text style={styles.sectionTitle}>
              {driver.is_online ? "طلبات متاحة قربك" : "فعّل الاتّصال لاستقبال الطلبات"}
            </Text>
          </>
        }
        refreshControl={
          <RefreshControl refreshing={available.isFetching && !available.isLoading} onRefresh={() => available.refetch()} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          driver.is_online && !available.isLoading ? (
            <EmptyState icon="🛵" title="لا توجد طلبات متاحة الآن" hint="ابقَ متّصلاً — ستظهر الطلبات القريبة هنا فور توفّرها" />
          ) : !driver.is_online ? (
            <EmptyState icon="⚡" title="أنت غير متّصل" hint="فعّل المفتاح أعلاه لبدء استقبال الطلبات" />
          ) : null
        }
        renderItem={({ item }) => (
          <OrderCard order={item} onPress={() => navigation.navigate("DriverOrder", { orderId: item.id })} />
        )}
      />
    </Screen>
  );
}

function OrderCard({ order, onPress, accent }: { order: Order; onPress: () => void; accent?: boolean }) {
  const count = order.items.reduce((s, i) => s + i.qty, 0);
  return (
    <View style={[styles.card, accent && styles.cardAccent]}>
      <View style={styles.cardHead}>
        <View style={[styles.cardIcon, accent && { backgroundColor: colors.primary }]}>
          <Icon name="receipt" size={20} color={accent ? "#fff" : colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardId}>طلب #{order.id.slice(0, 8)}</Text>
          <Text style={styles.cardMeta}>{count} عناصر</Text>
        </View>
        <PriceTag amount={Number(order.total)} size="md" />
      </View>

      {order.delivery_details ? (
        <View style={styles.addrRow}>
          <Icon name="location" size={15} color={colors.textMuted} />
          <Text style={styles.addrText} numberOfLines={1}>{order.delivery_details}</Text>
        </View>
      ) : null}

      <Pressable onPress={onPress} style={({ pressed }) => [styles.cta, pressed && { opacity: 0.9 }]}>
        <Text style={styles.ctaText}>{accent ? "متابعة التوصيل" : "عرض واستلام"}</Text>
        <Icon name="chevronLeft" size={16} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  statusCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.sm,
  },
  statusCardOn: { backgroundColor: colors.primary, borderColor: colors.primary, ...shadows.primary },
  statusAvatar: { width: 52, height: 52, borderRadius: radii.pill, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  statusTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  statusSub: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },

  sectionTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right", marginBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },

  card: { backgroundColor: colors.background, borderRadius: radii.xl, padding: spacing.md, gap: spacing.sm, borderWidth: 1, borderColor: colors.borderSoft, ...shadows.sm },
  cardAccent: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  cardHead: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  cardIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  cardId: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  cardMeta: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  addrRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, backgroundColor: colors.surface, padding: spacing.sm, borderRadius: radii.md },
  addrText: { flex: 1, fontSize: fontSize.small, color: colors.text, textAlign: "right" },
  cta: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, backgroundColor: colors.primary, height: 44, borderRadius: radii.lg, marginTop: spacing.xs },
  ctaText: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.body },
});
