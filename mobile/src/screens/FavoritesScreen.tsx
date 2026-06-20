import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { merchantsApi } from "../api/merchants";
import { Screen } from "../components/Screen";
import { Button } from "../components/Button";
import { Icon, type IconName } from "../components/Icon";
import { MerchantCardSkeleton } from "../components/Skeleton";
import { MerchantCard } from "./HomeScreen";
import { useFavorites } from "../store/favorites";
import { useCurrentLocation } from "../hooks/useLocation";
import { useT } from "../i18n";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "FavoritesTab">,
  NativeStackScreenProps<AppStackParamList>
>;

export function FavoritesScreen({ navigation }: Props) {
  const { t } = useT();
  const favIds = useFavorites((s) => s.ids);
  const loc = useCurrentLocation();

  const query = useQuery({
    queryKey: ["merchants", "for-favorites", { lat: loc.location?.lat, lng: loc.location?.lng }],
    queryFn: () => merchantsApi.list({ lat: loc.location?.lat, lng: loc.location?.lng }),
    enabled: !loc.loading && favIds.length > 0,
    staleTime: 60_000,
  });

  const favorites = (query.data ?? []).filter((m) => favIds.includes(m.id));

  return (
    <Screen padded={false}>
      {/* رأس أنيق */}
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Icon name="heartOutline" size={24} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.heroTitle}>{t("fav.title")}</Text>
          {favIds.length > 0 ? (
            <Text style={styles.heroSub}>
              {favIds.length} {t("fav.savedWord")}
            </Text>
          ) : null}
        </View>
      </View>

      {favIds.length === 0 ? (
        <FavEmpty
          icon="heartOutline"
          tint={colors.primarySoft}
          color={colors.accent}
          title={t("fav.empty")}
          hint={t("fav.emptyHint")}
          ctaLabel={t("fav.browse")}
          onCta={() => navigation.navigate("HomeTab")}
        />
      ) : query.isLoading ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ marginBottom: spacing.md }}>
              <MerchantCardSkeleton />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={favorites}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <FavEmpty
              icon="store"
              tint={colors.surface}
              color={colors.textMuted}
              title={t("fav.unavailable")}
              hint={t("fav.unavailableHint")}
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

function FavEmpty({
  icon,
  tint,
  color,
  title,
  hint,
  ctaLabel,
  onCta,
}: {
  icon: IconName;
  tint: string;
  color: string;
  title: string;
  hint?: string;
  ctaLabel?: string;
  onCta?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIconOuter, { backgroundColor: tint }]}>
        <View style={styles.emptyIconInner}>
          <Icon name={icon} size={32} color={color} />
        </View>
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {hint ? <Text style={styles.emptyHint}>{hint}</Text> : null}
      {ctaLabel && onCta ? (
        <Button label={ctaLabel} variant="accent" fullWidth={false} style={styles.emptyCta} onPress={onCta} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  heroTitle: {
    fontSize: fontSize.h1,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    textAlign: "right",
  },
  heroSub: {
    fontSize: fontSize.small,
    color: colors.textMuted,
    textAlign: "right",
    marginTop: 1,
  },
  list: { padding: spacing.lg, paddingTop: spacing.sm },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },
  emptyIconOuter: {
    width: 112,
    height: 112,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  emptyIconInner: {
    width: 72,
    height: 72,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  emptyTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "center" },
  emptyHint: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "center", marginTop: spacing.xs, lineHeight: 20, maxWidth: 280 },
  emptyCta: { marginTop: spacing.xl, paddingHorizontal: spacing.xxl },
});
