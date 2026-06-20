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
import { Icon, type IconName } from "../components/Icon";
import { Input } from "../components/Input";
import { Screen } from "../components/Screen";
import { useT } from "../i18n";
import { isValidDzPhone, normalizeDzPhone } from "../utils/phone";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Connexion">;

export function ConnexionScreen({ navigation, route }: Props) {
  const { quickSignIn } = useAuth();
  const { t } = useT();
  const role = route.params?.role ?? "customer";
  const isCustomer = role === "customer";
  const heroIcon: IconName = role === "merchant" ? "store" : "scooter";
  const title = role === "merchant" ? t("connexion.titleStore") : role === "driver" ? t("connexion.titleDriver") : t("connexion.titleCustomer");
  const subtitle = isCustomer ? t("connexion.subtitleCustomer") : t("connexion.subtitleLogin");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!isValidDzPhone(phone)) {
      setError(t("partner.needPhone"));
      return;
    }
    setError(null);
    try {
      setLoading(true);
      await quickSignIn(normalizeDzPhone(phone), name.trim() || undefined, role);
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
              <Icon name={heroIcon} size={40} color="#fff" />
            </View>
            <Text style={styles.brand}>Z-delivry</Text>
            <Text style={styles.tag}>{t("app.tagline")}</Text>
          </View>

          {/* ===== بطاقة النموذج ===== */}
          <View style={styles.card}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>

            <View style={styles.field}>
              <Input
                label={t("cart.phone")}
                value={phone}
                onChangeText={(v) => {
                  if (error) setError(null);
                  setPhone(v.replace(/[^\d]/g, ""));
                }}
                keyboardType="phone-pad"
                placeholder="555 12 34 56"
                autoComplete="tel"
                iconName="phone"
                prefix="+213"
                tint={colors.accent}
                style={styles.phoneInput}
                error={error}
                hint={!error ? t("connexion.phoneHint") : undefined}
                maxLength={12}
              />
            </View>

            <View style={styles.field}>
              <Input
                label={t("cart.nameOptional")}
                value={name}
                onChangeText={setName}
                placeholder={t("account.nameExample")}
                iconName="person"
                tint={colors.accent}
              />
            </View>

            <View style={styles.cta}>
              <Button label={t("connexion.cta")} onPress={submit} loading={loading} size="lg" variant="accent" />
            </View>

            <View style={styles.secureRow}>
              <Icon name="lock" size={14} color={colors.textFaint} />
              <Text style={styles.secureText}>{t("connexion.secure")}</Text>
            </View>
          </View>

          {/* ===== مزايا ===== */}
          <View style={styles.perks}>
            <Perk icon="clockFast" label={t("connexion.perkFast")} />
            <View style={styles.perkDivider} />
            <Perk icon="shield" label={t("connexion.perkSecure")} />
            <View style={styles.perkDivider} />
            <Perk icon="navigation" label={t("connexion.perkTrack")} />
          </View>

          <Text style={styles.footer}>{t("connexion.terms")}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Perk({ icon, label }: { icon: IconName; label: string }) {
  return (
    <View style={styles.perk}>
      <View style={styles.perkIconWrap}>
        <Icon name={icon} size={18} color={colors.accent} />
      </View>
      <Text style={styles.perkLabel}>{label}</Text>
    </View>
  );
}

const BADGE = 88;
const ACCENT_SOFT = colors.accent + "16";

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
    backgroundColor: ACCENT_SOFT,
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
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    ...shadows.accent,
  },
  brand: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.extrabold,
    color: colors.accent,
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
  field: { marginTop: spacing.lg },
  phoneInput: { textAlign: "left", writingDirection: "ltr" },
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
  perkIconWrap: {
    width: 38,
    height: 38,
    borderRadius: radii.pill,
    backgroundColor: ACCENT_SOFT,
    alignItems: "center",
    justifyContent: "center",
  },
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
