import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Screen } from "../components/Screen";
import { Icon, type IconName } from "../components/Icon";
import { useT } from "../i18n";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "About">;

const FEATURES: { icon: IconName; titleKey: string; subKey: string }[] = [
  { icon: "restaurant", titleKey: "about.feature1", subKey: "about.feature1Sub" },
  { icon: "leaf", titleKey: "about.feature2", subKey: "about.feature2Sub" },
  { icon: "basket", titleKey: "about.feature3", subKey: "about.feature3Sub" },
  { icon: "navigation", titleKey: "about.feature4", subKey: "about.feature4Sub" },
];

const STEPS = ["about.step1", "about.step2", "about.step3", "about.step4"];

export function AboutScreen({ navigation }: Props) {
  const { t } = useT();

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable hitSlop={8} style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("account.about")}</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.blob1} />
          <View style={styles.blob2} />
          <View style={styles.logoBadge}>
            <Icon name="scooter" size={40} color={colors.primary} />
          </View>
          <Text style={styles.appName}>{t("app.name")}</Text>
          <Text style={styles.tagline}>{t("app.tagline")}</Text>
          <View style={styles.versionChip}>
            <Text style={styles.versionText}>{t("account.version")}</Text>
          </View>
        </View>

        {/* مقدّمة */}
        <View style={styles.introCard}>
          <Text style={styles.introText}>{t("account.aboutText")}</Text>
        </View>

        {/* المزايا */}
        <Text style={styles.sectionTitle}>{t("about.featuresTitle")}</Text>
        <View style={styles.group}>
          {FEATURES.map((f, i) => (
            <View key={f.titleKey}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <View style={styles.featureRow}>
                <View style={styles.featureIcon}>
                  <Icon name={f.icon} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{t(f.titleKey)}</Text>
                  <Text style={styles.featureSub}>{t(f.subKey)}</Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* كيف يعمل */}
        <Text style={styles.sectionTitle}>{t("about.howTitle")}</Text>
        <View style={styles.group}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepRow}>
              <View style={styles.stepCol}>
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{i + 1}</Text>
                </View>
                {i < STEPS.length - 1 ? <View style={styles.stepLine} /> : null}
              </View>
              <Text style={styles.stepText}>{t(s)}</Text>
            </View>
          ))}
        </View>

        {/* تواصل */}
        <Text style={styles.sectionTitle}>{t("about.contactTitle")}</Text>
        <Pressable
          style={({ pressed }) => [styles.contactCard, pressed && { backgroundColor: colors.surfaceAlt }]}
          onPress={() => Linking.openURL(`mailto:${t("about.email")}`)}
        >
          <View style={styles.featureIcon}>
            <Icon name="mail" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>{t("about.emailLabel")}</Text>
            <Text style={styles.contactValue}>{t("about.email")}</Text>
          </View>
          <Icon name="chevronLeft" size={18} color={colors.textFaint} />
        </Pressable>

        {/* تذييل */}
        <View style={styles.footer}>
          <Text style={styles.footerMade}>{t("about.madeIn")}</Text>
          <Text style={styles.footerRights}>© 2026 {t("app.name")} — {t("about.rights")}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },

  // Hero
  hero: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.xxl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    overflow: "hidden",
    ...shadows.primary,
  },
  blob1: { position: "absolute", top: -50, insetInlineEnd: -30, width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.10)" },
  blob2: { position: "absolute", bottom: -45, insetInlineStart: -25, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.08)" },
  logoBadge: {
    width: 84,
    height: 84,
    borderRadius: radii.xxl + 6,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    ...shadows.sm,
  },
  appName: { fontSize: fontSize.display, fontWeight: fontWeight.extrabold, color: "#fff", letterSpacing: 0.3 },
  tagline: { fontSize: fontSize.body, color: "rgba(255,255,255,0.9)", marginTop: 2, textAlign: "center" },
  versionChip: {
    marginTop: spacing.md,
    backgroundColor: "rgba(255,255,255,0.20)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  versionText: { fontSize: fontSize.caption + 1, color: "#fff", fontWeight: fontWeight.bold },

  // Intro
  introCard: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.lg,
    marginTop: spacing.lg,
    ...shadows.sm,
  },
  introText: { fontSize: fontSize.body, color: colors.textMuted, textAlign: "right", lineHeight: 24 },

  sectionTitle: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textAlign: "right",
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  group: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    overflow: "hidden",
    ...shadows.sm,
  },
  divider: { height: 1, backgroundColor: colors.divider, marginInlineStart: 68 },

  featureRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, padding: spacing.md },
  featureIcon: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" },
  featureTitle: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  featureSub: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },

  // Steps
  stepRow: { flexDirection: "row-reverse", gap: spacing.md, paddingHorizontal: spacing.md },
  stepCol: { alignItems: "center", width: 28 },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.md,
  },
  stepNumText: { color: "#fff", fontWeight: fontWeight.extrabold, fontSize: fontSize.small },
  stepLine: { width: 2, flex: 1, backgroundColor: colors.border, marginVertical: 2 },
  stepText: { flex: 1, fontSize: fontSize.body, color: colors.text, textAlign: "right", paddingTop: spacing.md + 4, paddingBottom: spacing.md, fontWeight: fontWeight.medium },

  // Contact
  contactCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    ...shadows.sm,
  },
  contactValue: { fontSize: fontSize.small, color: colors.primary, textAlign: "right", marginTop: 2, writingDirection: "ltr" },

  footer: { alignItems: "center", marginTop: spacing.xxl, gap: spacing.xs },
  footerMade: { fontSize: fontSize.small, color: colors.textMuted, fontWeight: fontWeight.semibold },
  footerRights: { fontSize: fontSize.caption, color: colors.textFaint, textAlign: "center" },
});
