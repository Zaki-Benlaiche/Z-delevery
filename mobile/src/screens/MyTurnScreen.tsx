import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { appointmentsApi } from "../api/appointments";
import type { Appointment } from "../api/types";
import { Screen } from "../components/Screen";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "MyTurn">;

function arrivalTime(min: number): string {
  const d = new Date(Date.now() + min * 60000);
  return d.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit" });
}

export function MyTurnScreen({ route, navigation }: Props) {
  const appointmentId = route.params?.appointmentId;
  const queryClient = useQueryClient();

  const single = useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: () => appointmentsApi.get(appointmentId!),
    enabled: !!appointmentId,
    refetchInterval: 15_000,
  });
  const mineQ = useQuery({
    queryKey: ["appointments", "me"],
    queryFn: appointmentsApi.mine,
    enabled: !appointmentId,
    refetchInterval: 15_000,
  });

  const appt: Appointment | undefined = appointmentId ? single.data : mineQ.data?.[0];
  const loading = appointmentId ? single.isLoading : mineQ.isLoading;

  const cancel = useMutation({
    mutationFn: (id: string) => appointmentsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments", "me"] });
      navigation.goBack();
    },
    onError: (e) => Alert.alert("تعذّر الإلغاء", (e as Error).message),
  });

  const confirmCancel = (id: string) =>
    Alert.alert("إلغاء الموعد", "هل تريد إلغاء موعدك؟", [
      { text: "تراجع", style: "cancel" },
      { text: "إلغاء الموعد", style: "destructive", onPress: () => cancel.mutate(id) },
    ]);

  const q = appt?.queue;
  const ahead = q?.ahead ?? 0;
  const isServing = appt?.status === "serving" || ahead === 0;

  return (
    <Screen padded={false} background="white">
      <View style={styles.header}>
        <Pressable hitSlop={8} style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>موعدي</Text>
        <View style={styles.backBtn} />
      </View>

      {!appt ? (
        !loading ? (
          <EmptyState icon="🎫" title="لا موعد نشط" hint="احجز موعداً من قائمة الأطباء" />
        ) : null
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.clinic}>{appt.clinic_name ?? "العيادة"}</Text>

          {/* بطاقة التذكرة */}
          <View style={[styles.ticket, isServing && styles.ticketActive]}>
            <Text style={[styles.ticketLabel, isServing && styles.onText]}>رقمك في الطابور</Text>
            <Text style={[styles.ticketNumber, isServing && styles.onText]}>{appt.queue_number}</Text>
            {isServing ? (
              <View style={styles.nowBadge}>
                <Icon name="checkCircle" size={16} color="#fff" />
                <Text style={styles.nowText}>دورك الآن — توجّه للطبيب</Text>
              </View>
            ) : (
              <Text style={styles.ticketHint}>يُخدَم الآن رقم {q?.now_serving ?? 0}</Text>
            )}
          </View>

          {/* إحصاءات الطابور */}
          {!isServing ? (
            <View style={styles.statsRow}>
              <Stat icon="person" value={String(ahead)} label="أمامك" tint={colors.info} />
              <Stat icon="calendarClock" value={`~${arrivalTime(q?.est_wait_min ?? 0)}`} label="وقت حضورك المتوقّع" tint={colors.accent} />
              <Stat icon="clock" value={`${q?.est_wait_min ?? 0} د`} label="الانتظار التقديري" tint={colors.warning} />
            </View>
          ) : null}

          {/* تلميح */}
          <View style={styles.tipRow}>
            <Icon name="info" size={15} color={colors.textMuted} />
            <Text style={styles.tipText}>
              تتحدّث الأرقام تلقائياً. احضر قبل دورك بقليل تجنّباً للانتظار. (تقدير المدّة ~15 دقيقة لكل مريض)
            </Text>
          </View>

          {/* إلغاء */}
          <Pressable style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.8 }]} onPress={() => confirmCancel(appt.id)} disabled={cancel.isPending}>
            <Icon name="close" size={17} color={colors.danger} />
            <Text style={styles.cancelText}>إلغاء الموعد</Text>
          </Pressable>
        </ScrollView>
      )}
    </Screen>
  );
}

function Stat({ icon, value, label, tint }: { icon: Parameters<typeof Icon>[0]["name"]; value: string; label: string; tint: string }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: tint + "1A" }]}>
        <Icon name={icon} size={18} color={tint} />
      </View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={2}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },
  clinic: { fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "center", marginTop: spacing.sm },

  ticket: {
    alignItems: "center",
    backgroundColor: colors.surfaceAlt,
    borderRadius: radii.xxl,
    paddingVertical: spacing.xxl,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
  },
  ticketActive: { backgroundColor: colors.accent, borderColor: colors.accent, ...shadows.accent },
  ticketLabel: { fontSize: fontSize.body, color: colors.textMuted, fontWeight: fontWeight.semibold },
  ticketNumber: { fontSize: 72, fontWeight: fontWeight.extrabold, color: colors.accent, lineHeight: 84 },
  onText: { color: "#fff" },
  ticketHint: { fontSize: fontSize.body, color: colors.textMuted, marginTop: spacing.xs },
  nowBadge: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm, backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill },
  nowText: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.small },

  statsRow: { flexDirection: "row-reverse", gap: spacing.sm },
  stat: { flex: 1, alignItems: "center", gap: spacing.xs, backgroundColor: colors.background, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSoft, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, ...shadows.sm },
  statIcon: { width: 36, height: 36, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "center" },
  statLabel: { fontSize: fontSize.caption, color: colors.textMuted, textAlign: "center" },

  tipRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md },
  tipText: { flex: 1, fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", lineHeight: 20 },

  cancelBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, height: 50, borderRadius: radii.lg, backgroundColor: colors.dangerSoft },
  cancelText: { color: colors.danger, fontWeight: fontWeight.bold, fontSize: fontSize.body },
});
