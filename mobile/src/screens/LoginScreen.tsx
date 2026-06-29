import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { authApi } from "../api/auth";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
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
    <Screen background="white" padded={false} barStyle="dark-content">
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ===== الواجهة العلوية (Hero) ===== */}
          <View style={styles.hero}>
            <View style={styles.blobOne} />
            <View style={styles.blobTwo} />

            <View style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>🛵</Text>
            </View>

            <Text style={styles.brand}>Rserve-Vite</Text>
            <Text style={styles.tag}>توصيلك أسرع وأقرب</Text>
          </View>

          {/* ===== بطاقة النموذج ===== */}
          <View style={styles.card}>
            <Text style={styles.title}>أهلاً بك 👋</Text>
            <Text style={styles.subtitle}>
              أدخل رقم هاتفك وسنرسل لك رمز تحقّق لمرّة واحدة
            </Text>

            <View style={styles.field}>
              <Input
                label="رقم الهاتف"
                value={phone}
                onChangeText={(t) => {
                  if (error) setError(null);
                  setPhone(t.replace(/[^\d]/g, ""));
                }}
                keyboardType="phone-pad"
                placeholder="0555 12 34 56"
                autoComplete="tel"
                icon="📱"
                error={error}
                maxLength={15}
                returnKeyType="send"
                onSubmitEditing={submit}
              />
            </View>

            <Button label="إرسال الرمز" onPress={submit} loading={loading} size="lg" />

            <View style={styles.secureRow}>
              <Text style={styles.secureIcon}>🔒</Text>
              <Text style={styles.secureText}>
                رقمك آمن معنا ولن تتم مشاركته مع أي طرف
              </Text>
            </View>
          </View>

          {/* ===== مزايا سريعة ===== */}
          <View style={styles.perks}>
            <Perk icon="⚡" label={"توصيل\nسريع"} />
            <View style={styles.perkDivider} />
            <Perk icon="🛡️" label={"دفع\nآمن"} />
            <View style={styles.perkDivider} />
            <Perk icon="📍" label={"تتبّع\nمباشر"} />
          </View>

          <Text style={styles.footer}>
            بالمتابعة، أنت توافق على شروط الاستخدام وسياسة الخصوصية
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Perk({ icon, label }: { icon: string; label: string }) {
  return (
    <View style={styles.perk}>
      <Text style={styles.perkIcon}>{icon}</Text>
      <Text style={styles.perkLabel}>{label}</Text>
    </View>
  );
}

const BADGE = 96;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingTop: spacing.huge,
    paddingBottom: spacing.xxl,
    overflow: "hidden",
  },
  blobOne: {
    position: "absolute",
    top: -70,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  blobTwo: {
    position: "absolute",
    top: 30,
    left: -60,
    width: 140,
    height: 140,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
  },
  logoBadge: {
    width: BADGE,
    height: BADGE,
    borderRadius: radii.xxl + 6,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    ...shadows.primary,
  },
  logoEmoji: { fontSize: 46 },
  brand: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
    letterSpacing: 0.3,
  },
  tag: {
    fontSize: fontSize.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },

  // Card
  card: {
    backgroundColor: colors.background,
    borderRadius: radii.xxl,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.md,
  },
  title: {
    fontSize: fontSize.h2,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "right",
  },
  subtitle: {
    fontSize: fontSize.body,
    color: colors.textMuted,
    textAlign: "right",
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  field: { marginBottom: spacing.xl },

  secureRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  secureIcon: { fontSize: 13 },
  secureText: { fontSize: fontSize.small, color: colors.textFaint },

  // Perks
  perks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xxl,
  },
  perk: { flex: 1, alignItems: "center", gap: spacing.xs },
  perkIcon: { fontSize: 22 },
  perkLabel: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
    lineHeight: 15,
  },
  perkDivider: { width: 1, height: 34, backgroundColor: colors.border },

  footer: {
    fontSize: fontSize.caption,
    color: colors.textFaint,
    textAlign: "center",
    marginTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    lineHeight: 16,
  },
});
