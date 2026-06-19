import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { driversApi } from "../../api/drivers";
import { Button } from "../../components/Button";
import { Screen } from "../../components/Screen";
import { Icon, type IconName } from "../../components/Icon";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../../theme/colors";

type VehicleType = "moto" | "car" | "bike";

const VEHICLES: { value: VehicleType; label: string; icon: IconName; hint: string }[] = [
  { value: "moto", label: "دراجة نارية", icon: "scooter", hint: "الأسرع للمدينة" },
  { value: "car", label: "سيّارة", icon: "car", hint: "للطلبات الكبيرة" },
  { value: "bike", label: "دراجة هوائية", icon: "bike", hint: "اقتصادية" },
];

const BENEFITS: { icon: IconName; title: string; sub: string }[] = [
  { icon: "wallet", title: "أرباح فورية", sub: "تكسب رسوم كل توصيلة تنجزها" },
  { icon: "navigation", title: "طلبات قربك", sub: "نرسل لك أقرب الطلبات إليك" },
  { icon: "clockFast", title: "مرونة كاملة", sub: "اعمل متى شئت — اتّصل واقطع الاتّصال" },
];

export function DriverRegisterScreen() {
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const [vehicleType, setVehicleType] = useState<VehicleType>("moto");

  const register = useMutation({
    mutationFn: () => driversApi.register({ vehicle_type: vehicleType }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["driver", "me"] }),
    onError: (e) => Alert.alert("تعذّر التسجيل", (e as Error).message),
  });

  const footerPad = (insets.bottom > 0 ? insets.bottom : spacing.md) + spacing.sm;

  return (
    <Screen padded={false} background="white">
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 110 + footerPad }]} showsVerticalScrollIndicator={false}>
        {/* بطاقة ترحيب */}
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Icon name="scooter" size={36} color="#fff" />
          </View>
          <Text style={styles.heroTitle}>انضمّ إلى سائقي Z-delivry</Text>
          <Text style={styles.heroSub}>سجّل في خطوة واحدة وابدأ كسب المال من التوصيل في منطقتك</Text>
        </View>

        {/* المزايا */}
        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.title} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <Icon name={b.icon} size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitSub}>{b.sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* اختيار المركبة */}
        <Text style={styles.section}>اختر مركبتك</Text>
        <View style={styles.vehicleRow}>
          {VEHICLES.map((v) => {
            const active = v.value === vehicleType;
            return (
              <Pressable
                key={v.value}
                onPress={() => setVehicleType(v.value)}
                style={[styles.vehicleCard, active && styles.vehicleCardActive]}
              >
                {active ? (
                  <View style={styles.vehicleCheck}>
                    <Icon name="check" size={12} color="#fff" />
                  </View>
                ) : null}
                <View style={[styles.vehicleIcon, active && styles.vehicleIconActive]}>
                  <Icon name={v.icon} size={26} color={active ? "#fff" : colors.textMuted} />
                </View>
                <Text style={[styles.vehicleLabel, active && styles.vehicleLabelActive]} numberOfLines={1}>
                  {v.label}
                </Text>
                <Text style={styles.vehicleHint} numberOfLines={1}>{v.hint}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* ملاحظة التوثيق */}
        <View style={styles.noteCard}>
          <Icon name="shield" size={18} color={colors.info} />
          <Text style={styles.noteText}>
            بعد التسجيل يبقى حسابك قيد التوثيق من المنصّة قبل أن يصبح فعّالاً لاستلام الطلبات الحقيقية.
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: footerPad }]}>
        <Button
          label="إكمال التسجيل"
          onPress={() => register.mutate()}
          loading={register.isPending}
          style={styles.cta}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  heroIcon: {
    width: 84, height: 84, borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.xs,
    ...shadows.accent,
  },
  heroTitle: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "center" },
  heroSub: { fontSize: fontSize.small + 1, color: colors.textMuted, textAlign: "center", lineHeight: 21, paddingHorizontal: spacing.md },

  benefits: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    gap: spacing.md,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  benefitRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  benefitIcon: {
    width: 42, height: 42, borderRadius: radii.md,
    backgroundColor: colors.accent + "14",
    alignItems: "center", justifyContent: "center",
  },
  benefitTitle: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  benefitSub: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 1 },

  section: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right", marginTop: spacing.xl, marginBottom: spacing.md },
  vehicleRow: { flexDirection: "row-reverse", gap: spacing.sm },
  vehicleCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    gap: spacing.xs,
  },
  vehicleCardActive: { borderColor: colors.accent, backgroundColor: colors.accent + "0A" },
  vehicleCheck: {
    position: "absolute",
    top: spacing.sm,
    insetInlineEnd: spacing.sm,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: "center", justifyContent: "center",
  },
  vehicleIcon: {
    width: 52, height: 52, borderRadius: radii.pill,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  vehicleIconActive: { backgroundColor: colors.accent },
  vehicleLabel: { fontSize: fontSize.small, fontWeight: fontWeight.bold, color: colors.textMuted, textAlign: "center" },
  vehicleLabelActive: { color: colors.text },
  vehicleHint: { fontSize: fontSize.caption, color: colors.textFaint, textAlign: "center" },

  noteCard: {
    flexDirection: "row-reverse",
    gap: spacing.sm,
    backgroundColor: colors.infoSoft,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginTop: spacing.xl,
    alignItems: "flex-start",
  },
  noteText: { flex: 1, fontSize: fontSize.small, color: colors.info, textAlign: "right", lineHeight: 20 },

  footer: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    ...shadows.lg,
  },
  cta: { backgroundColor: colors.accent },
});
