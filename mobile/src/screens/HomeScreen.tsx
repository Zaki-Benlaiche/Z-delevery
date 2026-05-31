import { useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
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
import { offersApi } from "../api/offers";
import type { Merchant, MerchantType } from "../api/types";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import { MerchantCardSkeleton } from "../components/Skeleton";
import { FavoriteButton } from "../components/FavoriteButton";
import { OffersCarousel } from "../components/OffersCarousel";
import { useCurrentLocation } from "../hooks/useLocation";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "HomeTab">,
  NativeStackScreenProps<AppStackParamList>
>;

interface Category {
  key: MerchantType | "all";
  label: string;
  icon: string;
  color: string;
}

const CATEGORIES: Category[] = [
  { key: "all", label: "الكل", icon: "✨", color: "#FFF1E6" },
  { key: "restaurant", label: "مطاعم", icon: "🍔", color: "#FEF3C7" },
  { key: "clothing", label: "ملابس", icon: "👕", color: "#EFF6FF" },
  { key: "other", label: "متاجر", icon: "🛍️", color: "#ECFDF5" },
];

export function HomeScreen({ navigation }: Props) {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<MerchantType | "all">("all");
  const debouncedSearch = useDebouncedValue(search, 350);
  const loc = useCurrentLocation();

  const query = useQuery({
    queryKey: ["merchants", { lat: loc.location?.lat, lng: loc.location?.lng, q: debouncedSearch, type: activeCat }],
    queryFn: () =>
      merchantsApi.list({
        lat: loc.location?.lat,
        lng: loc.location?.lng,
        q: debouncedSearch || undefined,
        type: activeCat === "all" ? undefined : activeCat,
      }),
    enabled: !loc.loading,
    placeholderData: (prev) => prev,
    staleTime: 60_000,
  });

  const offers = useQuery({
    queryKey: ["offers"],
    queryFn: offersApi.list,
    staleTime: 120_000,
  });

  const header = (
    <View>
      <View style={styles.header}>
        <Text style={styles.greeting}>ماذا تشتهي اليوم؟ 😋</Text>
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

      {/* صفّ الأقسام */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.catRow}
      >
        {CATEGORIES.map((c) => {
          const active = activeCat === c.key;
          return (
            <Pressable key={c.key} style={styles.catItem} onPress={() => setActiveCat(c.key)}>
              <View style={[styles.catIcon, { backgroundColor: c.color }, active && styles.catIconActive]}>
                <Text style={{ fontSize: 26 }}>{c.icon}</Text>
              </View>
              <Text style={[styles.catLabel, active && styles.catLabelActive]}>{c.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* أحدث العروض */}
      {(offers.isLoading || (offers.data?.length ?? 0) > 0) && activeCat === "all" && !debouncedSearch ? (
        <>
          <Text style={styles.sectionTitle}>أحدث العروض</Text>
          <OffersCarousel
            offers={offers.data ?? []}
            loading={offers.isLoading}
            onPressOffer={(o) => navigation.navigate("Merchant", { merchantId: o.merchant_id })}
          />
        </>
      ) : null}

      <Text style={styles.sectionTitle}>المتاجر القريبة</Text>
    </View>
  );

  if (query.isLoading) {
    return (
      <Screen padded={false}>
        {header}
        <View style={styles.list}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ marginBottom: spacing.md }}>
              <MerchantCardSkeleton />
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      {query.error ? (
        <>
          {header}
          <EmptyState
            icon="⚠️"
            title="تعذّر تحميل التجّار"
            hint={(query.error as Error).message}
            ctaLabel="إعادة المحاولة"
            onCta={() => query.refetch()}
          />
        </>
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
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
              onRefresh={() => {
                query.refetch();
                offers.refetch();
              }}
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

export function MerchantCard({ merchant, onPress }: { merchant: Merchant; onPress: () => void }) {
  return (
    <Card onPress={onPress} variant="elevated" padding="sm" style={styles.card}>
      <View style={styles.favCorner}>
        <FavoriteButton merchantId={merchant.id} size={20} floating />
      </View>
      <Avatar uri={merchant.logo_url} fallback={merchant.name} size={64} shape="rounded" />
      <View style={{ flex: 1 }}>
        <Text style={styles.name} numberOfLines={1}>{merchant.name}</Text>
        <View style={styles.metaRow}>
          <View style={styles.ratingPill}>
            <Text style={styles.ratingText}>⭐ {Number(merchant.rating || 0).toFixed(1)}</Text>
          </View>
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
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  searchIcon: { fontSize: 15 },
  search: { flex: 1, fontSize: fontSize.body, color: colors.text, textAlign: "right" },
  locError: { color: colors.warning, fontSize: fontSize.small, textAlign: "right" },

  catRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, gap: spacing.lg },
  catItem: { alignItems: "center", gap: spacing.xs, width: 64 },
  catIcon: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  catIconActive: { borderColor: colors.primary },
  catLabel: { fontSize: fontSize.small, color: colors.textMuted, fontWeight: fontWeight.medium },
  catLabelActive: { color: colors.primary, fontWeight: fontWeight.bold },

  sectionTitle: {
    fontSize: fontSize.h4,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "right",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },

  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxl },
  card: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  favCorner: { position: "absolute", top: -spacing.xs, insetInlineEnd: -spacing.xs, zIndex: 2 },
  name: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  metaRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs, alignItems: "center" },
  ratingPill: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  ratingText: { fontSize: fontSize.caption + 1, color: colors.text, fontWeight: fontWeight.semibold },
  meta: { fontSize: fontSize.small, color: colors.textMuted },
  closed: { fontSize: fontSize.small, color: colors.danger, fontWeight: fontWeight.semibold },
  desc: { fontSize: fontSize.small, color: colors.textMuted, marginTop: 2, textAlign: "right" },
});
