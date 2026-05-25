import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { driversApi } from "../../api/drivers";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { Segmented } from "../../components/Segmented";
import { colors } from "../../theme/colors";

type VehicleType = "moto" | "car" | "bike";

export function DriverRegisterScreen() {
  const queryClient = useQueryClient();
  const [vehicleType, setVehicleType] = useState<VehicleType>("moto");

  const register = useMutation({
    mutationFn: () => driversApi.register({ vehicle_type: vehicleType }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["driver", "me"] }),
    onError: (e) => Alert.alert("تعذّر التسجيل", (e as Error).message),
  });

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>أهلاً بك ضمن سائقي Z-delivry 🛵</Text>
        <Text style={styles.subtitle}>
          اختر مركبتك لإكمال التسجيل وبدء استلام الطلبات
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>نوع المركبة</Text>
        <Segmented
          value={vehicleType}
          onChange={setVehicleType}
          options={[
            { value: "moto", label: "دراجة نارية" },
            { value: "car", label: "سيّارة" },
            { value: "bike", label: "دراجة هوائية" },
          ]}
        />

        <Button
          label="إكمال التسجيل"
          onPress={() => register.mutate()}
          loading={register.isPending}
        />
      </View>

      <Text style={styles.note}>
        ملاحظة: حسابك يبقى بانتظار التوثيق من المنصّة قبل أن يصبح فعّالاً للطلبات الحقيقية.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 40, gap: 8 },
  title: { fontSize: 22, fontWeight: "800", color: colors.text, textAlign: "right" },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: "right" },
  form: { marginTop: 32, gap: 16 },
  label: { fontSize: 14, fontWeight: "500", color: colors.text, textAlign: "right" },
  note: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: "auto",
    paddingTop: 24,
  },
});
