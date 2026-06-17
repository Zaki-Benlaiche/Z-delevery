import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../auth/context";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { Segmented } from "../components/Segmented";
import { useT } from "../i18n";
import type { UserRole } from "../api/types";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Connexion">;

export function ConnexionScreen({ navigation }: Props) {
  const { quickSignIn } = useAuth();
  const { t } = useT();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const digits = phone.replace(/[^\d]/g, "");
    if (digits.length < 9) {
      setError(t("partner.needPhone"));
      return;
    }
    setError(null);
    try {
      setLoading(true);
      await quickSignIn(digits, name.trim() || undefined, role);
      navigation.goBack();
    } catch (e) {
      Alert.alert("⚠️", (e as Error).message);
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
        {/* زرّ الإغلاق */}
        <Pressable
          style={({ pressed }) => [styles.close, pressed && { opacity: 0.6 }]}
          onPress={() => navigation.goBack()}
          hitSlop={10}
        >
          <Icon name="close" size={22} color={colors.text} />
        </Pressable>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ===== Hero ===== */}
          <View style={styles.hero}>
            <View style={styles.blobOne} />
            <View style={styles.blobTwo} />
            <View style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>🛵</Text>
            </View>
            <Text style={styles.brand}>Z-delivry</Text>
            <Text style={styles.tag}>{t("app.tagline")}</Text>
          </View>

          {/* ===== بطاقة النموذج ===== */}
          <View style={styles.card}>
            <Text style={styles.title}>{t("connexion.title")}</Text>
            <Text style={styles.subtitle}>{t("connexion.subtitle")}</Text>

            <Text style={styles.fieldLabel}>{t("connexion.roleHint")}</Text>
            <Segmented
              value={role}
              onChange={setRole}
              options={[
                { value: "customer", label: t("account.customer"), icon: "👤" },
                { value: "driver", label: t("account.driver"), icon: "🛵" },
              ]}
            />

            <View style={styles.field}>
              <Input
                label={t("cart.phone")}
                value={phone}
                onChangeText={(v) => {
                  if (error) setError(null);
                  setPhone(v.replace(/[^\d]/g, ""));
                }}
                keyboardType="phone-pad"
                placeholder="0555 12 34 56"
                autoComplete="tel"
                icon="📱"
                error={error}
                maxLength={15}
              />
            </View>

            <Input
              label={t("cart.nameOptional")}
              value={name}
              onChangeText={setName}
              placeholder={t("account.nameExample")}
              icon="🙂"
            />

            <View style={styles.cta}>
              <Button label={t("account.login")} onPress={submit} loading={loading} size="lg" />
            </View>

            <View style={styles.secureRow}>
              <Icon name="lock" size={14} color={colors.textFaint} />
              <Text style={styles.secureText}>{t("connexion.secure")}</Text>
            </View>
          </View>

          {/* ===== مزايا ===== */}
          <View style={styles.perks}>
            <Perk icon="⚡" label={t("connexion.perkFast")} />
            <View style={styles.perkDivider} />
            <Perk icon="🛡️" label={t("connexion.perkSecure")} />
            <View style={styles.perkDivider} />
            <Perk icon="📍" label={t("connexion.perkTrack")} />
          </View>

          <Text style={styles.footer}>{t("connexion.terms")}</Text>
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

const BADGE = 88;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  close: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.lg,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },

  // Hero
  hero: {
    alignItems: "center",
    paddingTop: spacing.huge,
    paddingBottom: spacing.xl,
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
  logoEmoji: { fontSize: 42 },
  brand: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.extrabold,
    color: colors.primary,
    letterSpacing: 0.3,
  },
  tag: { fontSize: fontSize.body, color: colors.textMuted, marginTop: spacing.xs },

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
  fieldLabel: {
    fontSize: fontSize.small,
    color: colors.text,
    fontWeight: fontWeight.semibold,
    textAlign: "right",
    marginBottom: spacing.sm,
  },
  field: { marginTop: spacing.lg },
  cta: { marginTop: spacing.xl },

  secureRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    marginTop: spacing.lg,
  },
  secureText: { fontSize: fontSize.small, color: colors.textFaint, textAlign: "center" },

  // Perks
  perks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.xl,
  },
  perk: { flex: 1, alignItems: "center", gap: spacing.xs },
  perkIcon: { fontSize: 22 },
  perkLabel: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
  perkDivider: { width: 1, height: 34, backgroundColor: colors.border },

  footer: {
    fontSize: fontSize.caption,
    color: colors.textFaint,
    textAlign: "center",
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    lineHeight: 16,
  },
});
