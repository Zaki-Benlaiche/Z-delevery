import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { merchantsApi } from "../api/merchants";
import type { Merchant } from "../api/types";
import { Screen } from "../components/Screen";
import { useCurrentLocation } from "../hooks/useLocation";
import { colors } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "HomeTab">,
  NativeStackScreenProps<AppStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const [search, setSearch] = useState("");
  const loc = useCurrentLocation();

  const query = useQuery({
    queryKey: ["merchants", { lat: loc.location?.lat, lng: loc.location?.lng, q: search }],
    queryFn: () =>
      merchantsApi.list({
        lat: loc.location?.lat,
        lng: loc.location?.lng,
        q: search || undefined,
      }),
    // ننتظر الموقع قبل الاستعلام (إلا إذا فشل، فنُحضرها بدون فرز بالقرب)
    enabled: !loc.loading,
  });

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>ماذا تشتهي اليوم؟</Text>
        <TextInput
          style={styles.search}
          placeholder="ابحث عن مطعم أو محل..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {loc.error ? (
          <Text style={styles.locError}>الموقع غير مفعّل — لن نُظهر القرب</Text>
        ) : null}
      </View>

      {query.isLoading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : query.error ? (
        <Text style={styles.error}>تعذّر تحميل التجّار: {(query.error as Error).message}</Text>
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <Text style={styles.empty}>لا توجد متاجر متاحة بعد في منطقتك</Text>
          }
          refreshControl={
            <RefreshControl
              refreshing={query.isFetching && !query.isLoading}
              onRefresh={() => query.refetch()}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }) => (
            <MerchantCard
              merchant={item}
              onPress={() => navigation.navigate("Merchant", { merchantId: item.id })}
            />
          )}
        />
      )}
    </Screen>
  );
}

function MerchantCard({ merchant, onPress }: { merchant: Merchant; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <View style={styles.logoWrap}>
        {merchant.logo_url ? (
          <Image source={{ uri: merchant.logo_url }} style={styles.logo} />
        ) : (
          <Text style={styles.logoFallback}>{merchant.name.charAt(0)}</Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{merchant.name}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>⭐ {Number(merchant.rating || 0).toFixed(1)}</Text>
          {merchant.distance_km != null ? (
            <Text style={styles.meta}>📍 {merchant.distance_km} كم</Text>
          ) : null}
          {!merchant.is_open ? <Text style={styles.closed}>مغلق</Text> : null}
        </View>
        {merchant.description ? (
          <Text style={styles.desc} numberOfLines={1}>{merchant.description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: colors.background,
    gap: 12,
  },
  greeting: { fontSize: 22, fontWeight: "700", color: colors.text, textAlign: "right" },
  search: {
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    fontSize: 15,
    color: colors.text,
    textAlign: "right",
  },
  locError: { color: colors.warning, fontSize: 12, textAlign: "right" },
  list: { padding: 16, paddingTop: 4 },
  card: {
    flexDirection: "row",
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  logoWrap: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logo: { width: "100%", height: "100%" },
  logoFallback: { fontSize: 24, fontWeight: "700", color: colors.primary },
  name: { fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "right" },
  metaRow: { flexDirection: "row", gap: 12, marginTop: 4 },
  meta: { fontSize: 13, color: colors.textMuted },
  closed: { fontSize: 12, color: colors.danger, fontWeight: "600" },
  desc: { fontSize: 13, color: colors.textMuted, marginTop: 2, textAlign: "right" },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
  error: { textAlign: "center", color: colors.danger, marginTop: 40, padding: 16 },
});
