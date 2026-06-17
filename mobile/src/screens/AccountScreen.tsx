import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Screen } from "../components/Screen";
import { Icon, type IconName } from "../components/Icon";
import { useAuth } from "../auth/context";
import { useT } from "../i18n";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "AccountTab">,
  NativeStackScreenProps<AppStackParamList>
>;
type Nav = Props["navigation"];

export function AccountScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const { t, lang, setLang } = useT();
  const [notif, setNotif] = useState(true);

  const roleLabel = !user
    ? t("account.guest")
    : user.role === "driver"
      ? t("account.driver")
      : user.role === "merchant"
        ? "تاجر"
        : t("account.customer");
  const isCustomerOrGuest = !user || user.role === "customer";

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* رأس الملف الشخصي */}
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{roleLabel.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{roleLabel}</Text>
            <Text style={styles.profileSub}>
              {user ? `#${user.user_id.slice(0, 8)}` : t("account.loginPrompt")}
            </Text>
          </View>
        </View>

        {/* ===== الإعدادات ===== */}
        <Text style={styles.groupTitle}>{t("account.settings")}</Text>
        <View style={styles.group}>
          {isCustomerOrGuest ? (
            <>
              <Row icon="location" tint={colors.infoSoft} color={colors.info} label={t("account.myAddresses")} onPress={() => navigation.navigate("Addresses")} />
              <Divider />
            </>
          ) : null}
          <Row
            icon="bell"
            tint={colors.warningSoft}
            color={colors.warning}
            label={t("account.notifications")}
            right={<Switch value={notif} onValueChange={setNotif} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />}
          />
          <Divider />
          <Row
            icon="globe"
            tint={colors.successSoft}
            color={colors.success}
            label={t("account.language")}
            value={lang === "ar" ? "🇩🇿 العربية" : "🇫🇷 Français"}
            onPress={() => setLang(lang === "ar" ? "fr" : "ar")}
          />
        </View>

        {/* ===== حول الخدمة ===== */}
        <Text style={styles.groupTitle}>{t("account.more")}</Text>
        <View style={styles.group}>
          <Row icon="info" tint={colors.surface} color={colors.textMuted} label={t("account.about")} onPress={() => Alert.alert(t("app.name"), t("account.aboutText"))} />
          {isCustomerOrGuest ? (
            <>
              <Divider />
              <Row icon="store" tint={colors.primarySoft} color={colors.primary} label={t("partner.addStore")} onPress={() => navigation.navigate("Partner", { mode: "store" })} />
              <Divider />
              <Row icon="scooter" tint="#EFF6FF" color={colors.info} label={t("partner.becomeDriver")} onPress={() => navigation.navigate("Partner", { mode: "driver" })} />
            </>
          ) : null}
          <Divider />
          <Row icon="feedback" tint={colors.surface} color={colors.textMuted} label={t("account.feedback")} onPress={() => Alert.alert(t("account.feedback"), t("account.feedbackText"))} />
        </View>

        {/* ===== الدخول/الخروج ===== */}
        {user ? (
          <Pressable style={styles.logout} onPress={signOut}>
            <Icon name="logout" size={18} color={colors.danger} />
            <Text style={styles.logoutText}>{t("account.signOut")}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.loginCta, pressed && styles.loginCtaPressed]}
            onPress={() => navigation.navigate("Connexion")}
          >
            <View style={styles.loginCtaIcon}>
              <Icon name="person" size={22} color="#fff" />
            </View>
            <View style={styles.loginCtaTextWrap}>
              <Text style={styles.loginCtaTitle}>{t("account.loginCtaTitle")}</Text>
              <Text style={styles.loginCtaSub}>{t("account.loginPrompt")}</Text>
            </View>
            <Icon name="chevronLeft" size={20} color="rgba(255,255,255,0.9)" />
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({
  icon,
  tint,
  color,
  label,
  value,
  onPress,
  right,
}: {
  icon: IconName;
  tint: string;
  color: string;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress && { backgroundColor: colors.surfaceAlt }]}
      onPress={onPress}
      disabled={!onPress && !right}
    >
      <View style={[styles.rowIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={19} color={color} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {right ?? (onPress ? <Icon name="chevronLeft" size={18} color={colors.textFaint} /> : null)}
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  profile: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 26, fontWeight: fontWeight.extrabold, color: colors.primary },
  profileName: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  profileSub: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },

  groupTitle: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textAlign: "right",
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  group: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.sm,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  rowIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: fontSize.bodyLg, fontWeight: fontWeight.semibold, color: colors.text, textAlign: "right" },
  rowValue: { fontSize: fontSize.small, color: colors.textMuted, marginInlineEnd: spacing.xs },
  divider: { height: 1, backgroundColor: colors.divider, marginInlineStart: 68 },

  logout: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.dangerSoft,
  },
  logoutText: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold, color: colors.danger },

  loginCta: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
  loginCtaPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  loginCtaIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  loginCtaTextWrap: { flex: 1 },
  loginCtaTitle: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.extrabold,
    color: "#fff",
    textAlign: "right",
  },
  loginCtaSub: {
    fontSize: fontSize.small,
    color: "rgba(255,255,255,0.85)",
    textAlign: "right",
    marginTop: 2,
  },
});
