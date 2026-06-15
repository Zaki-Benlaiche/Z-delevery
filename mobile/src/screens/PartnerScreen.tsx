import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { merchantsApi } from "../api/merchants";
import type { MerchantType } from "../api/types";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { Input } from "../components/Input";
import { Segmented } from "../components/Segmented";
import { Icon, type IconName } from "../components/Icon";
import { useAuth } from "../auth/context";
import { useCurrentLocation } from "../hooks/useLocation";
import { useT } from "../i18n";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Partner">;

const CATS: { value: MerchantType; icon: IconName; key: string }[] = [
  { value: "food", icon: "restaurant", key: "home.catFood" },
  { value: "fresh", icon: "leaf", key: "home.catFresh" },
  { value: "market", icon: "basket", key: "home.catMarket" },
];

export function PartnerScreen({ route, navigation }: Props) {
  const { t } = useT();
  const { quickSignIn, setRole } = useAuth();
  const loc = useCurrentLocation();
  const insets = useSafeAreaInsets();

  const [mode, setMode] = useState<"store" | "driver">(route.params?.mode ?? "store");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [type, setType] = useState<MerchantType>("food");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (phone.replace(/[^\d]/g, "").length < 9) {
      Alert.alert("✋", t("partner.needPhone"));
      return;
    }
    if (mode === "store") {
      if (!storeName.trim()) {
        Alert.alert("✋", t("partner.needStoreName"));
        return;
      }
      if (!loc.location) {
        Alert.alert("📍", t("partner.needLocation"));
        return;
      }
    }
    setBusy(true);
    try {
      // تسجيل دخول سريع دائماً → توكن جديد بالدور المطلوب (يتجاوز انتهاء الصلاحية)
      await quickSignIn(
        phone.replace(/[^\d]/g, ""),
        name.trim() || undefined,
        mode === "store" ? "merchant" : "driver",
      );
      if (mode === "store") {
        await merchantsApi.create({
          name: storeName.trim(),
          type,
          lat: loc.location!.lat,
          lng: loc.location!.lng,
        });
        Alert.alert("🎉", t("partner.storeSuccess"));
        await setRole("merchant"); // التطبيق يتحوّل لواجهة إدارة المتجر
        return;
      }
      // وضع السائق: التحوّل لواجهة السائق (تُكمل اختيار المركبة في DriverHomeScreen)
      await setRole("driver");
    } catch (e) {
      Alert.alert("⚠️", (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen padded={false} background="canvas">
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Icon name="back" size={22} color={colors.text} />
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Icon name={mode === "store" ? "store" : "scooter"} size={34} color="#fff" />
          </View>
          <Text style={styles.title}>{t("partner.title")}</Text>
          <Text style={styles.subtitle}>{t("partner.subtitle")}</Text>
        </View>

        <Segmented
          value={mode}
          onChange={(v) => setMode(v as "store" | "driver")}
          options={[
            { value: "store", label: `🏪 ${t("partner.tabStore")}` },
            { value: "driver", label: `🛵 ${t("partner.tabDriver")}` },
          ]}
        />

        <View style={styles.card}>
          <Input
            label={t("partner.yourPhone")}
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/[^\d]/g, ""))}
            keyboardType="phone-pad"
            placeholder="0555 12 34 56"
            icon="📱"
            maxLength={15}
          />
          <Input
            label={t("partner.yourName")}
            value={name}
            onChangeText={setName}
            placeholder={t("account.nameExample")}
            icon="🙂"
          />

          {mode === "store" ? (
            <>
              <Input
                label={t("partner.storeName")}
                value={storeName}
                onChangeText={setStoreName}
                placeholder="مثال: سوبيريت عبود"
                icon="🏪"
              />

              <Text style={styles.label}>{t("partner.storeType")}</Text>
              <View style={styles.catRow}>
                {CATS.map((c) => {
                  const active = type === c.value;
                  return (
                    <Pressable
                      key={c.value}
                      onPress={() => setType(c.value)}
                      style={[styles.catCard, active && styles.catCardActive]}
                    >
                      <Icon name={c.icon} size={24} color={active ? colors.primary : colors.textMuted} />
                      <Text style={[styles.catLabel, active && styles.catLabelActive]}>{t(c.key)}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>{t("partner.useLocation")}</Text>
              <View style={[styles.locBox, loc.location && styles.locBoxOk]}>
                <Icon name={loc.location ? "check" : "location"} size={18} color={loc.location ? colors.success : colors.textMuted} />
                <Text style={[styles.locText, loc.location && { color: colors.success }]}>
                  {loc.location ? t("partner.locationSet") : loc.loading ? t("partner.locating") : t("home.enableLocation")}
                </Text>
              </View>
            </>
          ) : (
            <View style={styles.driverNote}>
              <Text style={styles.driverNoteText}>
                🛵 ستختار نوع مركبتك في الخطوة التالية بعد الدخول.
              </Text>
            </View>
          )}
        </View>

        <Button
          label={mode === "store" ? t("partner.submitStore") : t("partner.submitDriver")}
          onPress={submit}
          loading={busy}
          size="lg"
          style={{ marginHorizontal: spacing.lg }}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  back: { alignSelf: "flex-end", padding: spacing.xs },
  hero: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  heroBadge: {
    width: 80,
    height: 80,
    borderRadius: radii.xxl,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
    ...shadows.primary,
  },
  title: { fontSize: fontSize.h1, fontWeight: fontWeight.extrabold, color: colors.text },
  subtitle: { fontSize: fontSize.body, color: colors.textMuted, textAlign: "center" },

  card: {
    backgroundColor: colors.background,
    borderRadius: radii.xxl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.sm,
  },
  label: { fontSize: fontSize.small, fontWeight: fontWeight.semibold, color: colors.text, textAlign: "right", marginTop: spacing.xs },

  catRow: { flexDirection: "row", gap: spacing.sm },
  catCard: {
    flex: 1,
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  catCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  catLabel: { fontSize: fontSize.small, color: colors.textMuted, fontWeight: fontWeight.semibold },
  catLabelActive: { color: colors.primary, fontWeight: fontWeight.bold },

  locBox: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  locBoxOk: { backgroundColor: colors.successSoft },
  locText: { fontSize: fontSize.small, color: colors.textMuted, fontWeight: fontWeight.semibold, textAlign: "right" },

  driverNote: { padding: spacing.md, borderRadius: radii.lg, backgroundColor: colors.primarySoft },
  driverNoteText: { fontSize: fontSize.body, color: colors.primaryDark, textAlign: "right", lineHeight: 22 },
});
