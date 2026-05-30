import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { addressesApi } from "../api/addresses";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { colors, fontSize, fontWeight, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Addresses">;

export function AddressesScreen({ navigation }: Props) {
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: ["addresses"], queryFn: addressesApi.list });

  const remove = useMutation({
    mutationFn: (id: string) => addressesApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["addresses"] }),
    onError: (e) => Alert.alert("تعذّر الحذف", (e as Error).message),
  });

  const confirmRemove = (id: string) =>
    Alert.alert("حذف العنوان", "هل أنت متأكّد؟", [
      { text: "إلغاء", style: "cancel" },
      { text: "حذف", style: "destructive", onPress: () => remove.mutate(id) },
    ]);

  return (
    <Screen>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(a) => a.id}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm + 2 }} />}
        ListEmptyComponent={
          !query.isLoading ? (
            <EmptyState
              icon="📍"
              title="لا توجد عناوين بعد"
              hint="أضف عنوانك الأوّل لتسهيل الطلبات القادمة"
              ctaLabel="إضافة عنوان"
              onCta={() => navigation.navigate("AddAddress")}
            />
          ) : null
        }
        renderItem={({ item }) => (
          <Card variant="outlined" padding="sm" onPress={() => confirmRemove(item.id)} style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{item.label}</Text>
              {item.details ? <Text style={styles.details}>{item.details}</Text> : null}
            </View>
            <Pressable hitSlop={10} onPress={() => confirmRemove(item.id)}>
              <Text style={styles.removeBtn}>حذف</Text>
            </Pressable>
          </Card>
        )}
      />
      <Button label="إضافة عنوان جديد" onPress={() => navigation.navigate("AddAddress")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  label: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  details: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  removeBtn: { color: colors.danger, fontWeight: fontWeight.bold },
});
