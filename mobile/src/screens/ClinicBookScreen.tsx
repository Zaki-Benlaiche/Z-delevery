import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { merchantsApi } from "../api/merchants";
import { appointmentsApi } from "../api/appointments";
import { cloudinaryThumb } from "../api/upload";
import { ApiError } from "../api/client";
import { Screen } from "../components/Screen";
import { Icon, type IconName } from "../components/Icon";
import { useAuth } from "../auth/context";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "ClinicBook">;

const ACCENT_SOFT = colors.accent + "16";

export function ClinicBookScreen({ route, navigation }: Props) {
  const { clinicId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [when, setWhen] = useState<"today" | "tomorrow">("today");

  const clinic = useQuery({
    queryKey: ["merchant", clinicId],
    queryFn: () => merchantsApi.detail(clinicId),
  });
  const c = clinic.data;

  const dayISO = () => {
    const d = new Date();
    if (when === "tomorrow") d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const book = useMutation({
    mutationFn: () => appointmentsApi.book(clinicId, dayISO()),
    onSuccess: (appt) => {
      queryClient.invalidateQueries({ queryKey: ["appointments", "me"] });
      navigation.replace("MyTurn", { appointmentId: appt.id });
    },
    onError: (e) => Alert.alert("تعذّر الحجز", e instanceof ApiError ? e.message : (e as Error).message),
  });

  const onBook = () => {
    if (!user) {
      navigation.navigate("Connexion");
      return;
    }
    book.mutate();
  };

  return (
    <Screen padded={false} background="white">
      <View style={styles.header}>
        <Pressable hitSlop={8} style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>حجز موعد</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* بطاقة العيادة */}
        <View style={styles.hero}>
          <View style={styles.avatar}>
            {c?.logo_url ? (
              <Image source={{ uri: cloudinaryThumb(c.logo_url, { w: 240 })! }} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <Icon name="doctor" size={40} color={colors.accent} />
            )}
          </View>
          <Text style={styles.name}>{c?.name ?? "..."}</Text>
          {c?.description ? <Text style={styles.specialty}>{c.description}</Text> : null}
          <View style={[styles.statePill, c?.is_open ? styles.openPill : styles.closedPill]}>
            <Text style={[styles.stateText, { color: c?.is_open ? colors.success : colors.textMuted }]}>
              {c?.is_open ? "● مفتوح الآن" : "● مغلق"}
            </Text>
          </View>
        </View>

        {/* اختيار اليوم */}
        <View>
          <Text style={styles.dayHeading}>اختر اليوم</Text>
          <View style={styles.dayRow}>
            {([["today", "اليوم"], ["tomorrow", "غداً"]] as const).map(([k, lbl]) => {
              const active = when === k;
              return (
                <Pressable key={k} onPress={() => setWhen(k)} style={[styles.dayChip, active && styles.dayChipActive]}>
                  <Icon name="calendarClock" size={16} color={active ? "#fff" : colors.textMuted} />
                  <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>{lbl}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* تفاصيل */}
        <View style={styles.infoCard}>
          {c?.open_hours ? <InfoRow icon="clock" label="ساعات العمل" value={c.open_hours} /> : null}
          <InfoRow icon="ticket" label="نظام الحجز" value="طابور رقمي — تأخذ رقماً وتتابع دورك" />
        </View>

        {/* كيف يعمل */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>كيف يعمل؟</Text>
          {[
            "أرسل طلبك، وتعطيك العيادة رقمك في الطابور",
            "تابع الرقم الحالي وكم شخصاً أمامك ووقت حضورك",
            "يصلك إشعار عند اقتراب دورك — احضر في الوقت",
          ].map((s, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
              <Text style={styles.stepText}>{s}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* زر الحجز */}
      <View style={[styles.footer, { paddingBottom: (insets.bottom || 0) + spacing.lg }]}>
        <Pressable
          onPress={onBook}
          disabled={book.isPending || (c && !c.is_open)}
          style={({ pressed }) => [
            styles.bookBtn,
            (book.isPending || (c && !c.is_open)) && { opacity: 0.5 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Icon name="ticket" size={20} color="#fff" />
          <Text style={styles.bookText}>
            {c && !c.is_open ? "العيادة مغلقة حالياً" : !user ? "سجّل الدخول للحجز" : "أرسل طلب الحجز"}
          </Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function InfoRow({ icon, label, value }: { icon: IconName; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><Icon name={icon} size={17} color={colors.accent} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.md },

  hero: { alignItems: "center", paddingVertical: spacing.lg, gap: spacing.xs },
  avatar: { width: 96, height: 96, borderRadius: radii.pill, backgroundColor: ACCENT_SOFT, alignItems: "center", justifyContent: "center", overflow: "hidden", marginBottom: spacing.sm },
  avatarImg: { width: "100%", height: "100%" },
  name: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "center" },
  specialty: { fontSize: fontSize.body, color: colors.textMuted, textAlign: "center" },
  statePill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radii.pill, marginTop: spacing.xs },
  openPill: { backgroundColor: colors.successSoft },
  closedPill: { backgroundColor: colors.surface },
  stateText: { fontSize: fontSize.small, fontWeight: fontWeight.bold },

  dayHeading: { fontSize: fontSize.small, color: colors.textMuted, fontWeight: fontWeight.semibold, textAlign: "right", marginBottom: spacing.xs },
  dayRow: { flexDirection: "row-reverse", gap: spacing.sm },
  dayChip: { flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, height: 48, borderRadius: radii.lg, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: "transparent" },
  dayChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayChipText: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.textMuted },
  dayChipTextActive: { color: "#fff" },

  infoCard: { backgroundColor: colors.background, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, padding: spacing.sm, ...shadows.sm },
  infoRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, padding: spacing.sm },
  infoIcon: { width: 38, height: 38, borderRadius: radii.md, backgroundColor: ACCENT_SOFT, alignItems: "center", justifyContent: "center" },
  infoLabel: { fontSize: fontSize.caption + 1, color: colors.textMuted, textAlign: "right" },
  infoValue: { fontSize: fontSize.body, color: colors.text, fontWeight: fontWeight.semibold, textAlign: "right", marginTop: 1 },

  howCard: { backgroundColor: colors.surfaceAlt, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm },
  howTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right", marginBottom: spacing.xs },
  stepRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  stepNum: { width: 26, height: 26, borderRadius: radii.pill, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  stepNumText: { color: "#fff", fontWeight: fontWeight.extrabold, fontSize: fontSize.small },
  stepText: { flex: 1, fontSize: fontSize.body, color: colors.text, textAlign: "right", lineHeight: 22 },

  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.borderSoft },
  bookBtn: {
    flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.sm,
    height: 54, borderRadius: radii.pill, backgroundColor: colors.accent, ...shadows.accent,
  },
  bookText: { color: "#fff", fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold },
});
