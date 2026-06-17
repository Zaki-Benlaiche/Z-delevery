import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { merchantsApi } from "../api/merchants";
import { Screen } from "../components/Screen";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
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
          <Icon name="heartFill" size={24} color={colors.danger} />
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
        <View style={styles.center}>
          <EmptyState
            icon="🤍"
            title={t("fav.empty")}
            hint={t("fav.emptyHint")}
            ctaLabel={t("fav.browse")}
            onCta={() => navigation.navigate("HomeTab")}
          />
        </View>
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
            <EmptyState
              icon="🔍"
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
    backgroundColor: colors.dangerSoft,
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
  center: { flex: 1, justifyContent: "center" },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
});
