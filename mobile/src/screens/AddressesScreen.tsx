import { Alert, FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { addressesApi } from "../api/addresses";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
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
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          !query.isLoading ? (
            <Text style={styles.empty}>لا توجد عناوين بعد — أضف عنوانك الأوّل</Text>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onLongPress={() => confirmRemove(item.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>{item.label}</Text>
              {item.details ? <Text style={styles.details}>{item.details}</Text> : null}
            </View>
            <Pressable hitSlop={10} onPress={() => confirmRemove(item.id)}>
              <Text style={styles.removeBtn}>حذف</Text>
            </Pressable>
          </Pressable>
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
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    gap: 10,
  },
  label: { fontSize: 15, fontWeight: "700", color: colors.text, textAlign: "right" },
  details: { fontSize: 13, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  removeBtn: { color: colors.danger, fontWeight: "700" },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
});
