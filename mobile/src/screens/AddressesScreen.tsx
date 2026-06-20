import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { addressesApi } from "../api/addresses";
import type { Address } from "../api/types";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { useT } from "../i18n";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Addresses">;

const ACCENT_SOFT = colors.accent + "16";

export function AddressesScreen({ navigation }: Props) {
  const { t } = useT();
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: ["addresses"], queryFn: addressesApi.list });
  const list = query.data ?? [];

  const remove = useMutation({
    mutationFn: (id: string) => addressesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
    onError: (e) => Alert.alert(t("address.deleteError"), (e as Error).message),
  });

  const confirmRemove = (id: string) =>
    Alert.alert(t("address.deleteTitle"), t("address.deleteMsg"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("address.delete"), style: "destructive", onPress: () => remove.mutate(id) },
    ]);

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("address.title")}</Text>
        {list.length > 0 ? (
          <Text style={styles.subtitle}>{t("address.count").replace("{n}", String(list.length))}</Text>
        ) : null}
      </View>

      <FlatList
        data={list}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          !query.isLoading ? (
            <EmptyState
              icon="📍"
              title={t("cart.noAddresses")}
              hint={t("address.emptyHint")}
              ctaLabel={t("cart.addAddress")}
              onCta={() => navigation.navigate("AddAddress")}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <AddressCard
            address={item}
            deleting={remove.isPending && remove.variables === item.id}
            onDelete={() => confirmRemove(item.id)}
          />
        )}
      />

      {list.length > 0 ? (
        <View style={styles.footer}>
          <Button label={t("address.addNew")} variant="accent" icon="＋" onPress={() => navigation.navigate("AddAddress")} />
        </View>
      ) : null}
    </Screen>
  );
}

function AddressCard({
  address,
  deleting,
  onDelete,
}: {
  address: Address;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <View style={[styles.card, deleting && { opacity: 0.5 }]}>
      <View style={styles.pin}>
        <Icon name="locationFill" size={20} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.label} numberOfLines={1}>{address.label}</Text>
        {address.details ? <Text style={styles.details} numberOfLines={2}>{address.details}</Text> : null}
      </View>
      <Pressable hitSlop={10} style={styles.trash} onPress={onDelete} disabled={deleting}>
        <Icon name="trash" size={18} color={colors.danger} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  subtitle: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },

  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.lg, flexGrow: 1 },

  card: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    ...shadows.sm,
  },
  pin: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: ACCENT_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  details: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2, lineHeight: 19 },
  trash: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.dangerSoft,
    alignItems: "center",
    justifyContent: "center",
  },

  footer: { padding: spacing.lg },
});
