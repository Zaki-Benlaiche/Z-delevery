import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { useAuth } from "../auth/context";
import { colors } from "../theme/colors";
import type { AuthStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AuthStackParamList, "Otp">;

export function OtpScreen({ route }: Props) {
  const { phone, devOtp } = route.params;
  const { signIn } = useAuth();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // في وضع التطوير: نملأ الرمز تلقائياً لتسهيل الاختبار
  useEffect(() => {
    if (devOtp) setCode(devOtp);
  }, [devOtp]);

  const submit = async () => {
    setError(null);
    if (code.length < 4) {
      setError("الرمز يجب أن يكون 4 أرقام");
      return;
    }
    setLoading(true);
    try {
      await signIn(phone, code, name || undefined);
      // التنقّل يُعاد توجيهه تلقائياً عبر AppNavigator عند تغيّر حالة المستخدم
    } catch (e) {
      Alert.alert("رمز غير صحيح", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.form}>
        <Text style={styles.title}>تحقّق من رمزك</Text>
        <Text style={styles.subtitle}>أرسلنا رمزاً إلى {phone}</Text>

        <Input
          label="الرمز"
          value={code}
          onChangeText={setCode}
          keyboardType="number-pad"
          placeholder="0000"
          maxLength={6}
          error={error}
        />

        <Input
          label="اسمك (اختياري — للحساب الجديد)"
          value={name}
          onChangeText={setName}
          placeholder="مثال: زكريا"
        />

        <Button label="تأكيد ودخول" onPress={submit} loading={loading} />

        {devOtp ? (
          <Text style={styles.devHint}>وضع التطوير: الرمز معبّأ تلقائياً ({devOtp})</Text>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16, marginTop: 40 },
  title: { fontSize: 24, fontWeight: "700", color: colors.text, textAlign: "right" },
  subtitle: { fontSize: 15, color: colors.textMuted, textAlign: "right", marginBottom: 8 },
  devHint: {
    fontSize: 12,
    color: colors.warning,
    textAlign: "center",
    marginTop: 8,
  },
});
