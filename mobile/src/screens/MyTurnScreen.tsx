import { useEffect, useRef } from "react";
import { Alert, Animated, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { appointmentsApi } from "../api/appointments";
import type { Appointment } from "../api/types";
import { Screen } from "../components/Screen";
import { EmptyState } from "../components/EmptyState";
import { Icon, type IconName } from "../components/Icon";
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
  const q = appt?.queue;
  const ahead = q?.ahead ?? 0;
  const isServing = appt?.status === "serving" || (!!appt && ahead === 0 && appt.status === "waiting");

  // نبض بطاقة "دورك الآن"
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isServing) { pulse.setValue(1); return; }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.04, duration: 750, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [isServing, pulse]);

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

  const call = () => { if (appt?.clinic_phone) Linking.openURL(`tel:${appt.clinic_phone}`).catch(() => {}); };
  const directions = () => {
    if (appt?.clinic_lat != null && appt?.clinic_lng != null)
      Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${appt.clinic_lat},${appt.clinic_lng}`).catch(() => {});
  };

  const yourNum = appt?.queue_number ?? 0;
  const serving = q?.now_serving ?? 0;
  const progress = yourNum > 0 ? Math.min(1, Math.max(0, serving / yourNum)) : 0;

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
        !loading ? <EmptyState icon="🎫" title="لا موعد نشط" hint="احجز موعداً من قسم الأطباء" /> : null
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* بطاقة العيادة */}
          <View style={styles.clinicCard}>
            <View style={styles.clinicAvatar}><Icon name="stethoscope" size={24} color={colors.accent} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clinicName} numberOfLines={1}>{appt.clinic_name ?? "العيادة"}</Text>
              <Text style={styles.clinicSub}>موعد اليوم · نظام الطابور</Text>
            </View>
          </View>

          {/* بطاقة التذكرة */}
          <Animated.View style={[styles.ticket, isServing && styles.ticketActive, { transform: [{ scale: pulse }] }]}>
            {isServing ? <View style={styles.liveDot} /> : null}
            <Text style={[styles.ticketLabel, isServing && styles.onText]}>رقمك في الطابور</Text>
            <Text style={[styles.ticketNumber, isServing && styles.onText]}>{appt.queue_number}</Text>
            {isServing ? (
              <View style={styles.nowBadge}>
                <Icon name="checkCircle" size={16} color="#fff" />
                <Text style={styles.nowText}>دورك الآن — توجّه للطبيب</Text>
              </View>
            ) : (
              <Text style={styles.ticketHint}>يُخدَم الآن رقم {serving}</Text>
            )}
          </Animated.View>

          {/* شريط تقدّم الطابور */}
          {!isServing ? (
            <View style={styles.progressCard}>
              <View style={styles.progressHead}>
                <Text style={styles.progressTitle}>تقدّم الطابور</Text>
                <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${Math.max(4, progress * 100)}%` }]} />
                <View style={[styles.youMarker, { insetInlineEnd: 0 }]}>
                  <Icon name="person" size={11} color="#fff" />
                </View>
              </View>
              <View style={styles.progressFoot}>
                <Text style={styles.progressEnd}>رقمك #{yourNum}</Text>
                <Text style={styles.progressStart}>يُخدَم #{serving}</Text>
              </View>
            </View>
          ) : null}

          {/* إحصاءات */}
          {!isServing ? (
            <View style={styles.statsRow}>
              <Stat icon="person" value={String(ahead)} label="أمامك" tint={colors.info} />
              <Stat icon="calendarClock" value={arrivalTime(q?.est_wait_min ?? 0)} label="وقت حضورك" tint={colors.accent} />
              <Stat icon="hourglass" value={`${q?.est_wait_min ?? 0} د`} label="الانتظار" tint={colors.warning} />
            </View>
          ) : null}

          {/* اتصال + اتجاهات */}
          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.callBtn, !appt.clinic_phone && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
              onPress={call}
              disabled={!appt.clinic_phone}
            >
              <Icon name="phone" size={18} color={colors.success} />
              <Text style={[styles.actionText, { color: colors.success }]}>اتصال</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.actionBtn, styles.dirBtn, appt.clinic_lat == null && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}
              onPress={directions}
              disabled={appt.clinic_lat == null}
            >
              <Icon name="navigation" size={18} color={colors.accent} />
              <Text style={[styles.actionText, { color: colors.accent }]}>الاتجاهات</Text>
            </Pressable>
          </View>

          {/* تلميح */}
          <View style={styles.tipRow}>
            <Icon name="info" size={15} color={colors.textMuted} />
            <Text style={styles.tipText}>
              تتحدّث الأرقام تلقائياً، وسيصلك إشعار عند اقتراب دورك. احضر قبل دورك بقليل.
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

function Stat({ icon, value, label, tint }: { icon: IconName; value: string; label: string; tint: string }) {
  return (
    <View style={styles.stat}>
      <View style={[styles.statIcon, { backgroundColor: tint + "1A" }]}><Icon name={icon} size={18} color={tint} /></View>
      <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
      <Text style={styles.statLabel} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  backBtn: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text },

  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl, gap: spacing.lg },

  clinicCard: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, backgroundColor: colors.background, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, padding: spacing.md, ...shadows.sm },
  clinicAvatar: { width: 48, height: 48, borderRadius: radii.pill, backgroundColor: colors.accent + "16", alignItems: "center", justifyContent: "center" },
  clinicName: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  clinicSub: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 1 },

  ticket: { alignItems: "center", backgroundColor: colors.surfaceAlt, borderRadius: radii.xxl, paddingVertical: spacing.xxl, borderWidth: 1.5, borderColor: colors.borderSoft },
  ticketActive: { backgroundColor: colors.accent, borderColor: colors.accent, ...shadows.accent },
  liveDot: { position: "absolute", top: spacing.md, insetInlineEnd: spacing.md, width: 10, height: 10, borderRadius: 5, backgroundColor: "#fff" },
  ticketLabel: { fontSize: fontSize.body, color: colors.textMuted, fontWeight: fontWeight.semibold },
  ticketNumber: { fontSize: 72, fontWeight: fontWeight.extrabold, color: colors.accent, lineHeight: 84 },
  onText: { color: "#fff" },
  ticketHint: { fontSize: fontSize.body, color: colors.textMuted, marginTop: spacing.xs },
  nowBadge: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm, backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill },
  nowText: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.small },

  // شريط التقدّم
  progressCard: { backgroundColor: colors.background, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, padding: spacing.lg, gap: spacing.sm, ...shadows.sm },
  progressHead: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  progressTitle: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text },
  progressPct: { fontSize: fontSize.body, fontWeight: fontWeight.extrabold, color: colors.accent },
  track: { height: 10, borderRadius: radii.pill, backgroundColor: colors.surface, overflow: "visible", justifyContent: "center" },
  fill: { position: "absolute", insetInlineStart: 0, height: 10, borderRadius: radii.pill, backgroundColor: colors.accent },
  youMarker: { position: "absolute", width: 22, height: 22, borderRadius: 11, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff", ...shadows.sm },
  progressFoot: { flexDirection: "row-reverse", justifyContent: "space-between" },
  progressEnd: { fontSize: fontSize.caption + 1, fontWeight: fontWeight.bold, color: colors.text },
  progressStart: { fontSize: fontSize.caption + 1, color: colors.textMuted },

  statsRow: { flexDirection: "row-reverse", gap: spacing.sm },
  stat: { flex: 1, alignItems: "center", gap: spacing.xs, backgroundColor: colors.background, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSoft, paddingVertical: spacing.md, paddingHorizontal: spacing.xs, ...shadows.sm },
  statIcon: { width: 36, height: 36, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "center" },
  statLabel: { fontSize: fontSize.caption, color: colors.textMuted, textAlign: "center" },

  actionRow: { flexDirection: "row-reverse", gap: spacing.sm },
  actionBtn: { flex: 1, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, height: 50, borderRadius: radii.lg, borderWidth: 1.5 },
  callBtn: { backgroundColor: colors.successSoft, borderColor: "transparent" },
  dirBtn: { backgroundColor: colors.accent + "12", borderColor: "transparent" },
  actionText: { fontSize: fontSize.body, fontWeight: fontWeight.bold },

  tipRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md },
  tipText: { flex: 1, fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", lineHeight: 20 },

  cancelBtn: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, height: 50, borderRadius: radii.lg, backgroundColor: colors.dangerSoft },
  cancelText: { color: colors.danger, fontWeight: fontWeight.bold, fontSize: fontSize.body },
});
