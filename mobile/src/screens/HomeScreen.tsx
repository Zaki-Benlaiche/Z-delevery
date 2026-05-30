import { useState } from "react";
import {
  FlatList,
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
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import { MerchantCardSkeleton } from "../components/Skeleton";
import { useCurrentLocation } from "../hooks/useLocation";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { colors, fontSize, fontWeight, radii, spacing } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "HomeTab">,
  NativeStackScreenProps<AppStackParamList>
>;

export function HomeScreen({ navigation }: Props) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const loc = useCurrentLocation();

  const query = useQuery({
    queryKey: ["merchants", { lat: loc.location?.lat, lng: loc.location?.lng, q: debouncedSearch }],
    queryFn: () =>
      merchantsApi.list({
        lat: loc.location?.lat,
        lng: loc.location?.lng,
        q: debouncedSearch || undefined,
      }),
    // ننتظر الموقع قبل الاستعلام (إلا إذا فشل، فنُحضرها بدون فرز بالقرب)
    enabled: !loc.loading,
    // نُبقي النتائج السابقة على الشاشة أثناء جلب التحديث — يمنع وميض التحميل
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.greeting}>ماذا تشتهي اليوم؟</Text>
        <View style={styles.searchShell}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.search}
            placeholder="ابحث عن مطعم أو محل..."
            placeholderTextColor={colors.textFaint}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        {loc.error ? (
          <Text style={styles.locError}>الموقع غير مفعّل — لن نُظهر القرب</Text>
        ) : null}
      </View>

      {query.isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ marginBottom: spacing.md }}>
              <MerchantCardSkeleton />
            </View>
          ))}
        </View>
      ) : query.error ? (
        <EmptyState
          icon="⚠️"
          title="تعذّر تحميل التجّار"
          hint={(query.error as Error).message}
          ctaLabel="إعادة المحاولة"
          onCta={() => query.refetch()}
        />
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <EmptyState
              icon="🛍️"
              title="لا توجد متاجر بعد"
              hint="لا توجد متاجر متاحة في منطقتك حالياً — جرّب لاحقاً"
            />
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
    <Card onPress={onPress} variant="elevated" padding="sm" style={styles.card}>
      <Avatar uri={merchant.logo_url} fallback={merchant.name} size={60} shape="rounded" />
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
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  greeting: { fontSize: fontSize.h2, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  searchShell: {
    height: 46,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchIcon: { fontSize: 15 },
  search: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.text,
    textAlign: "right",
  },
  locError: { color: colors.warning, fontSize: fontSize.small, textAlign: "right" },
  list: { padding: spacing.lg, paddingTop: spacing.xs },
  card: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "center",
  },
  name: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  metaRow: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
  meta: { fontSize: fontSize.small, color: colors.textMuted },
  closed: { fontSize: fontSize.small, color: colors.danger, fontWeight: fontWeight.semibold },
  desc: { fontSize: fontSize.small, color: colors.textMuted, marginTop: 2, textAlign: "right" },
});
