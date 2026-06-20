import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, StatusBar, StyleSheet, Text, View } from "react-native";
import MapView, { type Region } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { addressesApi } from "../api/addresses";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Input } from "../components/Input";
import { useCurrentLocation } from "../hooks/useLocation";
import { useT } from "../i18n";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "AddAddress">;

// مركز افتراضي: الجزائر العاصمة، يُستبدل بموقع المستخدم حين يصلنا
const DEFAULT_REGION: Region = {
  latitude: 36.7538,
  longitude: 3.0588,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export function AddAddressScreen({ navigation }: Props) {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const loc = useCurrentLocation();
  const queryClient = useQueryClient();
  const [region, setRegion] = useState<Region>(DEFAULT_REGION);
  const [label, setLabel] = useState("");
  const [details, setDetails] = useState("");

  // عند معرفة موقع المستخدم، نمرّ المركز إليه
  useEffect(() => {
    if (loc.location) {
      setRegion((r) => ({ ...r, latitude: loc.location!.lat, longitude: loc.location!.lng }));
    }
  }, [loc.location]);

  const recenter = () => {
    if (loc.location) {
      setRegion((r) => ({ ...r, latitude: loc.location!.lat, longitude: loc.location!.lng }));
    }
  };

  const create = useMutation({
    mutationFn: () =>
      addressesApi.create({
        label: label.trim() || t("address.presetHome"),
        details: details.trim() || null,
        lat: region.latitude,
        lng: region.longitude,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["addresses"] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert(t("address.saveError"), (e as Error).message),
  });

  const presets = [
    { key: "home", icon: "home" as const, label: t("address.presetHome") },
    { key: "work", icon: "store" as const, label: t("address.presetWork") },
    { key: "other", icon: "location" as const, label: t("address.presetOther") },
  ];

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.mapWrap}>
        <MapView style={StyleSheet.absoluteFill} region={region} onRegionChangeComplete={setRegion} />

        {/* دبّوس ثابت في المنتصف */}
        <View style={styles.pinOverlay} pointerEvents="none">
          <View style={styles.pinLift}>
            <Icon name="locationFill" size={42} color={colors.accent} />
          </View>
          <View style={styles.pinDot} />
        </View>

        {/* رجوع */}
        <Pressable
          style={[styles.fab, styles.backFab, { top: insets.top + spacing.sm }]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
        >
          <Icon name="back" size={22} color={colors.text} />
        </Pressable>

        {/* تلميح */}
        <View style={[styles.hint, { top: insets.top + spacing.sm }]}>
          <Icon name="info" size={14} color="#fff" />
          <Text style={styles.hintText} numberOfLines={2}>{t("address.mapHint")}</Text>
        </View>

        {/* إعادة التمركز على موقعي */}
        <Pressable style={[styles.fab, styles.recenterFab]} onPress={recenter} hitSlop={8}>
          <Icon name="navigation" size={20} color={colors.accent} />
        </Pressable>
      </View>

      {/* ورقة النموذج */}
      <View style={[styles.sheet, { paddingBottom: (insets.bottom || spacing.md) + spacing.md }]}>
        <View style={styles.grabber} />
        <Text style={styles.sheetTitle}>{t("address.formTitle")}</Text>

        <View style={styles.presets}>
          {presets.map((p) => {
            const active = label === p.label;
            return (
              <Pressable
                key={p.key}
                style={[styles.preset, active && styles.presetActive]}
                onPress={() => setLabel(p.label)}
              >
                <Icon name={p.icon} size={15} color={active ? colors.accent : colors.textMuted} />
                <Text style={[styles.presetText, active && styles.presetTextActive]}>{p.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Input
          label={t("address.labelField")}
          value={label}
          onChangeText={setLabel}
          placeholder={t("address.labelPlaceholder")}
          iconName="tag"
          tint={colors.accent}
          maxLength={60}
        />
        <Input
          label={t("address.detailsField")}
          value={details}
          onChangeText={setDetails}
          placeholder={t("address.detailsPlaceholder")}
          iconName="edit"
          tint={colors.accent}
          maxLength={255}
        />
        <Button label={t("address.save")} variant="accent" onPress={() => create.mutate()} loading={create.isPending} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  mapWrap: { flex: 1, position: "relative" },

  pinOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  pinLift: { transform: [{ translateY: -21 }] },
  pinDot: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(10,147,150,0.25)",
    borderWidth: 1,
    borderColor: colors.accent,
  },

  fab: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
  },
  backFab: { insetInlineStart: spacing.lg },
  recenterFab: { insetInlineEnd: spacing.lg, bottom: radii.xxl + spacing.md },

  hint: {
    position: "absolute",
    insetInlineEnd: spacing.lg + 52,
    insetInlineStart: spacing.lg + 52,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: "rgba(15,23,42,0.78)",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
  },
  hintText: { flex: 1, color: "#fff", fontSize: fontSize.caption + 1, textAlign: "center", lineHeight: 16 },

  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    marginTop: -radii.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    gap: spacing.md,
    ...shadows.lg,
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.xs },
  sheetTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },

  presets: { flexDirection: "row-reverse", gap: spacing.sm },
  preset: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  presetActive: { backgroundColor: colors.accent + "16", borderColor: colors.accent },
  presetText: { fontSize: fontSize.small, fontWeight: fontWeight.semibold, color: colors.textMuted },
  presetTextActive: { color: colors.accent },
});
