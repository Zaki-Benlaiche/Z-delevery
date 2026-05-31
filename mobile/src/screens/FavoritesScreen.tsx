import { FlatList, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { merchantsApi } from "../api/merchants";
import { Screen } from "../components/Screen";
import { Header } from "../components/Header";
import { EmptyState } from "../components/EmptyState";
import { MerchantCardSkeleton } from "../components/Skeleton";
import { MerchantCard } from "./HomeScreen";
import { useFavorites } from "../store/favorites";
import { useCurrentLocation } from "../hooks/useLocation";
import { spacing } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "FavoritesTab">,
  NativeStackScreenProps<AppStackParamList>
>;

export function FavoritesScreen({ navigation }: Props) {
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
      <Header title="المفضّلة ❤️" />
      {favIds.length === 0 ? (
        <EmptyState
          icon="🤍"
          title="لا مفضّلة بعد"
          hint="اضغط على القلب في أي متجر لإضافته هنا"
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
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          ListEmptyComponent={
            <EmptyState icon="🔍" title="المتاجر المفضّلة غير متاحة" hint="ربما أُغلقت أو حُذفت" />
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
  list: { padding: spacing.lg, paddingTop: spacing.md },
});
