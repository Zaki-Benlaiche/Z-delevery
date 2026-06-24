import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { addressesApi } from "../api/addresses";
import type { Address } from "../api/types";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { Icon } from "../components/Icon";
import { useT } from "../i18n";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Addresses">;

const ACCENT_SOFT = colors.accent + "16";

export function AddressesScreen({ navigation }: Props) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
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
        <Pressable hitSlop={8} style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t("address.title")}</Text>
          {list.length > 0 ? (
            <Text style={styles.subtitle}>{t("address.count").replace("{n}", String(list.length))}</Text>
          ) : null}
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(a) => a.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          !query.isLoading ? (
            <View style={styles.empty}>
              <View style={styles.emptyIconOuter}>
                <View style={styles.emptyIconInner}>
                  <Icon name="locationFill" size={34} color={colors.accent} />
                </View>
              </View>
              <Text style={styles.emptyTitle}>{t("cart.noAddresses")}</Text>
              <Text style={styles.emptyHint}>{t("address.emptyHint")}</Text>
              <Button
                label={t("cart.addAddress")}
                variant="accent"
                icon="＋"
                fullWidth={false}
                style={styles.emptyCta}
                onPress={() => navigation.navigate("AddAddress")}
              />
            </View>
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
        <View style={[styles.footer, { paddingBottom: (insets.bottom || 0) + spacing.lg }]}>
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
  header: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
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
    width: 46,
    height: 46,
    borderRadius: radii.pill,
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

  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },
  emptyIconOuter: {
    width: 112,
    height: 112,
    borderRadius: radii.pill,
    backgroundColor: ACCENT_SOFT,
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
