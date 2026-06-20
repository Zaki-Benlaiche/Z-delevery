import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Location from "expo-location";
import { useQuery } from "@tanstack/react-query";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { merchantsApi } from "../api/merchants";
import { offersApi } from "../api/offers";
import { cloudinaryThumb } from "../api/upload";
import type { Merchant, MerchantType } from "../api/types";
import { Screen } from "../components/Screen";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import { MerchantCardSkeleton } from "../components/Skeleton";
import { FavoriteButton } from "../components/FavoriteButton";
import { OffersCarousel } from "../components/OffersCarousel";
import { Icon, type IconName } from "../components/Icon";
import { useCurrentLocation } from "../hooks/useLocation";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useT } from "../i18n";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "HomeTab">,
  NativeStackScreenProps<AppStackParamList>
>;

interface Category {
  key: MerchantType;
  labelKey: string;
  subKey: string;
  emoji: string;
  dual?: boolean;
  image?: number;
  color: string;
}

const CATEGORIES: Category[] = [
  { key: "food", labelKey: "home.catFood", subKey: "home.catFoodSub", emoji: "🍔", image: require("../../assets/categories/food.jpg"), color: "#FEF3C7" },
  { key: "fresh", labelKey: "home.catFresh", subKey: "home.catFreshSub", emoji: "🥩🥦", image: require("../../assets/categories/fresh.jpg"), color: "#ECFDF5" },
  { key: "market", labelKey: "home.catMarket", subKey: "home.catMarketSub", emoji: "🛒", image: require("../../assets/categories/market.jpg"), color: "#EFF6FF" },
];

const TYPE_META: Record<MerchantType, { labelKey: string; emoji: string; tint: string }> = {
  food: { labelKey: "type.food", emoji: "🍔", tint: "#FEF3C7" },
  fresh: { labelKey: "type.fresh", emoji: "🥬", tint: "#ECFDF5" },
  market: { labelKey: "type.market", emoji: "🛒", tint: "#EFF6FF" },
};

/** تقدير وقت التوصيل من المسافة (كما تفعل تطبيقات التوصيل) — يُعيد المدى فقط */
function etaRange(km: number | null): string {
  const mins = km == null ? 25 : Math.round(12 + km * 5);
  const lo = Math.min(55, Math.max(10, Math.round(mins / 5) * 5));
  return `${lo}–${lo + 10}`;
}

export function HomeScreen({ navigation }: Props) {
  const { t } = useT();
  const [search, setSearch] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCat, setActiveCat] = useState<MerchantType>("food");
  const [area, setArea] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 350);
  const loc = useCurrentLocation();

  // اسم الحيّ/المدينة من الإحداثيات (مع تجاهل صامت عند الفشل)
  useEffect(() => {
    if (!loc.location) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await Location.reverseGeocodeAsync({
          latitude: loc.location!.lat,
          longitude: loc.location!.lng,
        });
        const p = r[0];
        if (!cancelled && p)
          setArea(p.district || p.subregion || p.city || p.region || null);
      } catch {
        /* تجاهل */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loc.location?.lat, loc.location?.lng]);

  const query = useQuery({
    queryKey: ["merchants", { lat: loc.location?.lat, lng: loc.location?.lng, q: debouncedSearch, type: activeCat }],
    queryFn: () =>
      merchantsApi.list({
        lat: loc.location?.lat,
        lng: loc.location?.lng,
        q: debouncedSearch || undefined,
        type: debouncedSearch ? undefined : activeCat,
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

  const isBrowsing = !debouncedSearch;
  const merchants = query.data ?? [];
  const featured = isBrowsing
    ? [...merchants].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)).slice(0, 6)
    : [];

  const header = (
    <View>
      {/* شريط الموقع */}
      <View style={styles.locBar}>
        <Pressable
          style={({ pressed }) => [styles.locSelector, pressed && { opacity: 0.6 }]}
          onPress={() => navigation.navigate("Addresses")}
          hitSlop={6}
        >
          <View style={styles.locPin}>
            <Icon name="locationFill" size={18} color="#fff" />
          </View>
          <View style={styles.locTextCol}>
            <Text style={styles.locLabel}>{t("home.deliverTo")}</Text>
            <View style={styles.locValueRow}>
              <Text style={styles.locValue} numberOfLines={1}>
                {area ?? (loc.loading ? t("home.locating") : t("home.currentLocation"))}
              </Text>
              <View style={styles.locChevronWrap}>
                <Icon name="chevronDown" size={13} color={colors.primary} />
              </View>
            </View>
          </View>
        </Pressable>
        <View style={styles.locDivider} />
        <View style={styles.bell}>
          <Icon name="bell" size={18} color={colors.text} />
          <View style={styles.bellDot} />
        </View>
      </View>

      {/* العنوان + البحث */}
      <View style={styles.searchBlock}>
        <View style={styles.searchRow}>
          <View style={[styles.searchShell, searchFocused && styles.searchShellFocused]}>
            <View style={styles.searchIconWrap}>
              <Icon name="search" size={17} color={colors.accent} />
            </View>
            <TextInput
              style={styles.search}
              placeholder={t("home.search")}
              placeholderTextColor={colors.textFaint}
              value={search}
              onChangeText={setSearch}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              returnKeyType="search"
            />
            {search.length > 0 ? (
              <Pressable hitSlop={8} style={styles.searchClear} onPress={() => setSearch("")}>
                <Icon name="close" size={14} color={colors.textMuted} />
              </Pressable>
            ) : null}
          </View>
        </View>
        {loc.error ? <Text style={styles.locError}>{t("home.enableLocation")}</Text> : null}
      </View>

      {/* العروض */}
      {(offers.isLoading || (offers.data?.length ?? 0) > 0) && isBrowsing ? (
        <>
          <SectionTitle title={t("home.offers")} icon="tag" />
          <OffersCarousel
            offers={offers.data ?? []}
            loading={offers.isLoading}
            onPressOffer={(o) => navigation.navigate("Merchant", { merchantId: o.merchant_id })}
          />
        </>
      ) : null}

      {/* الأقسام الرئيسية: Food / Fresh / Market */}
      <View style={styles.catRow}>
        {CATEGORIES.map((c) => {
          const active = activeCat === c.key;
          return (
            <Pressable
              key={c.key}
              style={({ pressed }) => [styles.catCard, active && styles.catCardActive, pressed && styles.pressed]}
              onPress={() => setActiveCat(c.key)}
            >
              <View style={styles.catIconWrap}>
                <View style={[styles.catIcon, active && styles.catIconActive, !c.image && { backgroundColor: c.color }]}>
                  {c.image ? (
                    <Image source={c.image} style={styles.catImg} resizeMode="cover" />
                  ) : (
                    <Text style={[styles.catEmoji, c.dual && styles.catEmojiDual]}>{c.emoji}</Text>
                  )}
                </View>
                {active ? (
                  <View style={styles.catCheck}>
                    <Icon name="check" size={11} color="#fff" />
                  </View>
                ) : null}
              </View>
              <Text style={[styles.catLabel, active && styles.catLabelActive]} numberOfLines={1}>
                {t(c.labelKey)}
              </Text>
              <Text style={styles.catSub} numberOfLines={1}>
                {t(c.subKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* الأكثر طلباً (صفّ أفقي) */}
      {featured.length >= 3 ? (
        <>
          <SectionTitle title={t("home.topNearby")} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.railRow}
          >
            {featured.map((m) => (
              <FeaturedCard
                key={m.id}
                merchant={m}
                onPress={() => navigation.navigate("Merchant", { merchantId: m.id })}
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      <SectionTitle title={debouncedSearch ? t("home.searchResults") : t("home.allStores")} />
    </View>
  );

  if (query.isLoading) {
    return (
      <Screen padded={false} background="white">
        {header}
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ marginBottom: spacing.lg }}>
              <MerchantCardSkeleton />
            </View>
          ))}
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false} background="white">
      {query.error ? (
        <>
          {header}
          <EmptyState
            icon="⚠️"
            title={t("home.loadError")}
            hint={(query.error as Error).message}
            ctaLabel={t("common.retry")}
            onCta={() => query.refetch()}
          />
        </>
      ) : (
        <FlatList
          data={merchants}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={header}
          ItemSeparatorComponent={() => <View style={{ height: spacing.lg }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <EmptyState
              icon="🛍️"
              title={t("home.noStores")}
              hint={t("home.noStoresHint")}
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

function SectionTitle({ title, icon }: { title: string; icon?: IconName }) {
  return (
    <View style={styles.sectionRow}>
      {icon ? (
        <View style={styles.sectionIcon}>
          <Icon name={icon} size={15} color={colors.accent} />
        </View>
      ) : (
        <View style={styles.sectionBar} />
      )}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

/** بطاقة "الأكثر طلباً" — مدمجة للصفّ الأفقي */
function FeaturedCard({ merchant, onPress }: { merchant: Merchant; onPress: () => void }) {
  const { t } = useT();
  const meta = TYPE_META[merchant.type];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.railCard, pressed && styles.pressed]}
    >
      <View style={[styles.railCover, { backgroundColor: meta.tint }]}>
        {merchant.logo_url ? (
          <Image source={{ uri: cloudinaryThumb(merchant.logo_url, { w: 400 })! }} style={styles.railCoverImg} resizeMode="cover" />
        ) : (
          <Text style={styles.railEmoji}>{meta.emoji}</Text>
        )}
        {!merchant.is_open ? (
          <View style={styles.railDim}>
            <Text style={styles.railClosed}>{t("merchant.closedNow")}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.railName} numberOfLines={1}>{merchant.name}</Text>
      <View style={styles.railMeta}>
        <Icon name="star" size={13} color={colors.warning} />
        <Text style={styles.railRating}>{Number(merchant.rating || 0).toFixed(1)}</Text>
        {merchant.distance_km != null ? (
          <Text style={styles.railDistance}>· {merchant.distance_km} {t("common.km")}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

/** بطاقة المتجر الرئيسية — واجهة صورية */
export function MerchantCard({ merchant, onPress }: { merchant: Merchant; onPress: () => void }) {
  const { t } = useT();
  const meta = TYPE_META[merchant.type];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {/* الواجهة */}
      <View style={[styles.cover, { backgroundColor: meta.tint }]}>
        {merchant.logo_url ? (
          <Image source={{ uri: cloudinaryThumb(merchant.logo_url, { w: 800 })! }} style={styles.coverImg} resizeMode="cover" />
        ) : (
          <Text style={styles.coverEmoji}>{meta.emoji}</Text>
        )}

        {!merchant.is_open ? <View style={styles.coverDim} /> : null}

        <View style={styles.favFloat}>
          <FavoriteButton merchantId={merchant.id} size={18} floating />
        </View>

        {merchant.is_open ? (
          <View style={styles.etaBadge}>
            <Icon name="scooter" size={14} color={colors.text} />
            <Text style={styles.etaText}>{etaRange(merchant.distance_km)} {t("common.min")}</Text>
          </View>
        ) : (
          <View style={styles.closedBadge}>
            <Text style={styles.closedBadgeText}>{t("merchant.closedNow")}</Text>
          </View>
        )}
      </View>

      {/* المحتوى */}
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={1}>{merchant.name}</Text>
        <View style={styles.metaRow}>
          <View style={styles.ratingPill}>
            <Icon name="star" size={12} color={colors.success} />
            <Text style={styles.ratingText}>{Number(merchant.rating || 0).toFixed(1)}</Text>
          </View>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.typeText}>{t(meta.labelKey)}</Text>
          {merchant.distance_km != null ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.metaText}>{merchant.distance_km} {t("common.km")}</Text>
            </>
          ) : null}
        </View>
        {merchant.description ? (
          <Text style={styles.desc} numberOfLines={1}>{merchant.description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // شريط الموقع
  locBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 2,
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.sm,
  },
  locSelector: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  locPin: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.primary,
  },
  locDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.divider,
  },
  locTextCol: { flex: 1 },
  locLabel: {
    fontSize: fontSize.caption,
    color: colors.primary,
    fontWeight: fontWeight.bold,
    textAlign: "right",
    letterSpacing: 0.3,
  },
  locValueRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, marginTop: 1 },
  locValue: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    maxWidth: "82%",
  },
  locChevronWrap: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
  },
  bellDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.background,
  },

  // البحث
  searchBlock: { paddingHorizontal: spacing.lg, gap: spacing.md, marginBottom: spacing.xs },
  searchRow: { flexDirection: "row", gap: spacing.md },
  searchShell: {
    flex: 1,
    height: 54,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    paddingInlineStart: spacing.sm,
    paddingInlineEnd: spacing.lg,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.sm,
  },
  searchShellFocused: { borderColor: colors.accent, ...shadows.md },
  searchIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  search: { flex: 1, fontSize: fontSize.body, color: colors.text, textAlign: "right" },
  searchClear: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  locError: { color: colors.warning, fontSize: fontSize.small, textAlign: "right" },

  // الأقسام الرئيسية (Food/Fresh/Market)
  catRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  catCard: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.xl,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    ...shadows.sm,
  },
  catCardActive: { borderColor: colors.accent, backgroundColor: colors.primarySoft },
  catIconWrap: { position: "relative" },
  catIcon: {
    width: 84,
    height: 84,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#fff",
    ...shadows.sm,
  },
  catIconActive: { borderColor: colors.accent },
  catImg: { width: "100%", height: "100%" },
  catEmoji: { fontSize: 26 },
  catEmojiDual: { fontSize: 17, letterSpacing: -2 },
  catCheck: {
    position: "absolute",
    bottom: -2,
    insetInlineStart: -2,
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  catLabel: { fontSize: fontSize.body, color: colors.text, fontWeight: fontWeight.bold, marginTop: spacing.xs },
  catLabelActive: { color: colors.accent },
  catSub: { fontSize: fontSize.caption, color: colors.textMuted },

  sectionRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionBar: {
    width: 4,
    height: 20,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    textAlign: "right",
  },

  // الصفّ الأفقي
  railRow: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingBottom: spacing.xs },
  railCard: { width: 158 },
  railCover: {
    width: 158,
    height: 100,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginBottom: spacing.sm,
  },
  railCoverImg: { width: "100%", height: "100%" },
  railEmoji: { fontSize: 40 },
  railDim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  railClosed: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.small },
  railName: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  railMeta: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, marginTop: 2 },
  railRating: { fontSize: fontSize.small, color: colors.text, fontWeight: fontWeight.semibold },
  railDistance: { fontSize: fontSize.small, color: colors.textMuted },

  // القائمة + البطاقة الرئيسية
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.xxxl },
  pressed: { opacity: 0.95, transform: [{ scale: 0.99 }] },
  card: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    overflow: "hidden",
    ...shadows.md,
  },
  cover: {
    height: 132,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coverImg: { width: "100%", height: "100%" },
  coverEmoji: { fontSize: 54 },
  coverDim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(15,23,42,0.35)" },
  favFloat: { position: "absolute", top: spacing.sm, left: spacing.sm },
  etaBadge: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    ...shadows.sm,
  },
  etaText: { fontSize: fontSize.small, fontWeight: fontWeight.bold, color: colors.text },
  closedBadge: {
    position: "absolute",
    bottom: spacing.sm,
    right: spacing.sm,
    backgroundColor: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  closedBadgeText: { fontSize: fontSize.small, fontWeight: fontWeight.bold, color: "#fff" },

  body: { padding: spacing.lg, gap: spacing.xs },
  name: { fontSize: fontSize.h4, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  ratingPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.successSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  ratingText: { fontSize: fontSize.caption + 1, color: colors.success, fontWeight: fontWeight.bold },
  dot: { color: colors.textFaint, fontSize: fontSize.body },
  typeText: { fontSize: fontSize.small, color: colors.textMuted, fontWeight: fontWeight.medium },
  metaText: { fontSize: fontSize.small, color: colors.textMuted },
  desc: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right" },
});
