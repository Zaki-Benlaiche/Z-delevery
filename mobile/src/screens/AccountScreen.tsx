import { useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { Input } from "../components/Input";
import { Segmented } from "../components/Segmented";
import { Icon } from "../components/Icon";
import { useAuth } from "../auth/context";
import { useT } from "../i18n";
import type { UserRole } from "../api/types";
import { colors, fontSize, fontWeight, spacing } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "AccountTab">,
  NativeStackScreenProps<AppStackParamList>
>;

function LanguageSelector() {
  const { t, lang, setLang } = useT();
  return (
    <View style={styles.langBlock}>
      <View style={styles.langHeader}>
        <Icon name="globe" size={18} color={colors.textMuted} />
        <Text style={styles.langLabel}>{t("account.language")}</Text>
      </View>
      <Segmented
        value={lang}
        onChange={(v) => setLang(v as "ar" | "fr")}
        options={[
          { value: "ar", label: "🇩🇿 العربية" },
          { value: "fr", label: "🇫🇷 Français" },
        ]}
      />
    </View>
  );
}

export function AccountScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const { t } = useT();

  if (!user) return <GuestAccount />;

  const roleLabel =
    user.role === "driver" ? t("account.driver") : user.role === "customer" ? t("account.customer") : user.role;

  return (
    <Screen>
      <Card variant="soft" padding="md" style={styles.profile}>
        <Avatar fallback={roleLabel} size={56} shape="circle" />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{roleLabel}</Text>
          <Text style={styles.muted}>{user.user_id.slice(0, 8)}</Text>
        </View>
      </Card>

      <View style={styles.section}>
        <Button label={t("account.myAddresses")} variant="secondary" onPress={() => navigation.navigate("Addresses")} />
      </View>

      <LanguageSelector />

      <View style={{ marginTop: "auto" }}>
        <Button label={t("account.signOut")} onPress={signOut} variant="ghost" />
      </View>
    </Screen>
  );
}

function GuestAccount() {
  const { quickSignIn } = useAuth();
  const { t } = useT();
  const [showLogin, setShowLogin] = useState(false);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>("customer");
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (phone.replace(/[^\d]/g, "").length < 9) {
      Alert.alert("✋", t("cart.phone"));
      return;
    }
    try {
      setLoading(true);
      await quickSignIn(phone.replace(/[^\d]/g, ""), name.trim() || undefined, role);
    } catch (e) {
      Alert.alert("⚠️", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Card variant="soft" padding="lg" style={styles.welcome}>
        <Text style={styles.welcomeEmoji}>👋</Text>
        <Text style={styles.welcomeTitle}>{t("account.welcome")}</Text>
        <Text style={styles.welcomeHint}>{t("account.guestHint")}</Text>
      </Card>

      {showLogin ? (
        <View style={styles.loginBox}>
          <Segmented
            value={role}
            onChange={setRole}
            options={[
              { value: "customer", label: t("account.customer") },
              { value: "driver", label: t("account.driver") },
            ]}
          />
          <Input
            label={t("cart.phone")}
            value={phone}
            onChangeText={(t2) => setPhone(t2.replace(/[^\d]/g, ""))}
            keyboardType="phone-pad"
            placeholder="0555 12 34 56"
            maxLength={15}
          />
          <Input
            label={t("cart.nameOptional")}
            value={name}
            onChangeText={setName}
            placeholder={t("account.nameExample")}
          />
          <Button label={t("account.login")} onPress={login} loading={loading} />
        </View>
      ) : (
        <View style={styles.section}>
          <Button label={t("account.haveAccount")} variant="secondary" onPress={() => setShowLogin(true)} />
        </View>
      )}

      <LanguageSelector />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl },
  name: { fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  muted: { color: colors.textMuted, fontSize: fontSize.small, textAlign: "right", marginTop: 2 },
  section: { gap: spacing.sm + 2, marginTop: spacing.lg },

  welcome: { alignItems: "center", gap: spacing.sm, marginTop: spacing.xl },
  welcomeEmoji: { fontSize: 44 },
  welcomeTitle: { fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "center" },
  welcomeHint: { fontSize: fontSize.body, color: colors.textMuted, textAlign: "center", lineHeight: 22 },

  loginBox: { gap: spacing.md, marginTop: spacing.xl },

  langBlock: { marginTop: spacing.xl, gap: spacing.sm },
  langHeader: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs },
  langLabel: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
});
