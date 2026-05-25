import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { authApi } from "../api/auth";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { colors } from "../theme/colors";
import type { AuthStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (phone.length < 9) {
      setError("رقم الهاتف غير صالح");
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.sendOtp(phone);
      navigation.navigate("Otp", { phone, devOtp: res.dev_otp });
    } catch (e) {
      Alert.alert("تعذّر الإرسال", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.brand}>Z-delivry</Text>
        <Text style={styles.tag}>توصيلك أسرع وأقرب</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.title}>أهلاً بك 👋</Text>
        <Text style={styles.subtitle}>أدخل رقم هاتفك لاستلام رمز التحقّق</Text>

        <Input
          label="رقم الهاتف"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="0555 12 34 56"
          autoComplete="tel"
          error={error}
          maxLength={15}
        />

        <Button label="إرسال الرمز" onPress={submit} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: "center", marginTop: 40, marginBottom: 48 },
  brand: { fontSize: 36, fontWeight: "800", color: colors.primary },
  tag: { fontSize: 14, color: colors.textMuted, marginTop: 4 },
  form: { gap: 16 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, textAlign: "right" },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: "right", marginBottom: 8 },
});
