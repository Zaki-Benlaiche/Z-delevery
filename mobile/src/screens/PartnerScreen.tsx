import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { merchantsApi } from "../api/merchants";
import type { MerchantType } from "../api/types";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { Input } from "../components/Input";
import { Icon, type IconName } from "../components/Icon";
import { useAuth } from "../auth/context";
import { useCurrentLocation } from "../hooks/useLocation";
import { useT } from "../i18n";
import { isValidDzPhone, normalizeDzPhone } from "../utils/phone";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Partner">;
type Mode = "store" | "driver";

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

  const mode: Mode = route.params?.mode ?? "store";
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [storeName, setStoreName] = useState("");
  const [type, setType] = useState<MerchantType>("food");
  const [busy, setBusy] = useState(false);

  const isStore = mode === "store";
  const brand = isStore ? colors.primary : colors.accent;
  const brandSoft = isStore ? colors.primarySoft : colors.accent + "16";

  const submit = async () => {
    if (!isValidDzPhone(phone)) {
      Alert.alert("✋", t("partner.needPhone"));
      return;
    }
    if (isStore) {
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
      await quickSignIn(normalizeDzPhone(phone), name.trim() || undefined, isStore ? "merchant" : "driver");
      if (isStore) {
        await merchantsApi.create({ name: storeName.trim(), type, lat: loc.location!.lat, lng: loc.location!.lng });
        Alert.alert("🎉", t("partner.storeSuccess"));
        await setRole("merchant");
        return;
      }
      await setRole("driver");
    } catch (e) {
      Alert.alert("⚠️", (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <Screen padded={false} background="canvas">
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + spacing.sm }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.back} hitSlop={8}>
          <Icon name="back" size={22} color={colors.text} />
        </Pressable>

        {/* Hero */}
        <View style={styles.hero}>
          <View style={[styles.heroRing, { backgroundColor: brandSoft }]}>
            <View style={[styles.heroBadge, { backgroundColor: brand }, isStore ? shadows.primary : shadows.accent]}>
              <Icon name={isStore ? "store" : "scooter"} size={32} color="#fff" />
            </View>
          </View>
          <Text style={styles.title}>{isStore ? t("partner.addStore") : t("partner.becomeDriver")}</Text>
          <Text style={styles.subtitle}>{isStore ? t("partner.addStoreSub") : t("partner.becomeDriverSub")}</Text>
        </View>

        {/* مزايا (المتجر) */}
        {isStore ? (
          <View style={styles.perks}>
            <Perk icon="receiptFill" label={t("partner.perkOrders")} tint={brandSoft} color={brand} />
            <View style={styles.perkDivider} />
            <Perk icon="store" label={t("partner.perkDashboard")} tint={brandSoft} color={brand} />
            <View style={styles.perkDivider} />
            <Perk icon="check" label={t("partner.perkFree")} tint={brandSoft} color={brand} />
          </View>
        ) : null}

        {/* النموذج */}
        <View style={styles.card}>
          <Input
            label={t("partner.yourPhone")}
            value={phone}
            onChangeText={(v) => setPhone(v.replace(/[^\d]/g, ""))}
            keyboardType="phone-pad"
            placeholder="555 12 34 56"
            iconName="phone"
            prefix="+213"
            tint={brand}
            style={styles.phoneInput}
            maxLength={12}
          />
          <Input
            label={t("partner.yourName")}
            value={name}
            onChangeText={setName}
            placeholder={t("account.nameExample")}
            iconName="person"
            tint={brand}
          />

          {isStore ? (
            <>
              <Input
                label={t("partner.storeName")}
                value={storeName}
                onChangeText={setStoreName}
                placeholder={t("partner.storeNamePlaceholder")}
                iconName="store"
                tint={brand}
              />

              <Text style={styles.label}>{t("partner.storeType")}</Text>
              <View style={styles.catRow}>
                {CATS.map((c) => {
                  const active = type === c.value;
                  return (
                    <Pressable
                      key={c.value}
                      onPress={() => setType(c.value)}
                      style={[styles.catCard, active && { borderColor: brand, backgroundColor: brandSoft }]}
                    >
                      <Icon name={c.icon} size={24} color={active ? brand : colors.textMuted} />
                      <Text style={[styles.catLabel, active && { color: brand, fontWeight: fontWeight.bold }]}>{t(c.key)}</Text>
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
            <View style={[styles.driverNote, { backgroundColor: brandSoft }]}>
              <Icon name="info" size={16} color={brand} />
              <Text style={[styles.driverNoteText, { color: brand }]}>{t("partner.driverNote")}</Text>
            </View>
          )}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* زرّ التأكيد السفلي */}
      <View style={[styles.footer, { paddingBottom: (insets.bottom || spacing.md) + spacing.sm }]}>
        <Button
          label={isStore ? t("partner.submitStore") : t("partner.submitDriver")}
          onPress={submit}
          loading={busy}
          size="lg"
          variant={isStore ? "primary" : "accent"}
        />
      </View>
    </Screen>
  );
}

function Perk({ icon, label, tint, color }: { icon: IconName; label: string; tint: string; color: string }) {
  return (
    <View style={styles.perk}>
      <View style={[styles.perkIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={17} color={color} />
      </View>
      <Text style={styles.perkLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.lg },
  back: {
    alignSelf: "flex-start",
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },

  hero: { alignItems: "center", gap: spacing.xs },
  heroRing: {
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  heroBadge: { width: 72, height: 72, borderRadius: radii.xxl, alignItems: "center", justifyContent: "center" },
  title: { fontSize: fontSize.h1, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "center" },
  subtitle: { fontSize: fontSize.body, color: colors.textMuted, textAlign: "center", maxWidth: 300 },

  perks: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    ...shadows.sm,
  },
  perk: { flex: 1, alignItems: "center", gap: spacing.xs },
  perkIcon: { width: 38, height: 38, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  perkLabel: { fontSize: fontSize.caption, color: colors.textMuted, fontWeight: fontWeight.semibold, textAlign: "center" },
  perkDivider: { width: 1, height: 34, backgroundColor: colors.border },

  card: {
    backgroundColor: colors.background,
    borderRadius: radii.xxl,
    padding: spacing.xl,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.sm,
  },
  phoneInput: { textAlign: "left", writingDirection: "ltr" },
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
  catLabel: { fontSize: fontSize.small, color: colors.textMuted, fontWeight: fontWeight.semibold },

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

  driverNote: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg },
  driverNoteText: { flex: 1, fontSize: fontSize.small, textAlign: "right", lineHeight: 21, fontWeight: fontWeight.medium },

  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.canvas,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
  },
});
