import { Alert, FlatList, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { merchantsApi } from "../../api/merchants";
import { appointmentsApi } from "../../api/appointments";
import type { ClinicQueueItem, MerchantDetail } from "../../api/types";
import { Screen } from "../../components/Screen";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../../theme/colors";

const STATUS_LABEL: Record<string, string> = {
  waiting: "بالانتظار", serving: "يُخدَم الآن", done: "تمّ", cancelled: "أُلغي",
};
const STATUS_COLOR: Record<string, string> = {
  waiting: colors.warning, serving: colors.accent, done: colors.success, cancelled: colors.danger,
};

export function DoctorQueueScreen({ clinic }: { clinic: MerchantDetail }) {
  const queryClient = useQueryClient();

  const queue = useQuery({
    queryKey: ["clinic-queue", clinic.id],
    queryFn: () => appointmentsApi.queue(clinic.id),
    refetchInterval: 10_000,
    placeholderData: (p) => p,
  });

  const toggleOpen = useMutation({
    mutationFn: (open: boolean) => merchantsApi.update(clinic.id, { is_open: open }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-merchant"] }),
  });

  const next = useMutation({
    mutationFn: () => appointmentsApi.next(clinic.id),
    onSuccess: (data) => queryClient.setQueryData(["clinic-queue", clinic.id], data),
    onError: (e) => Alert.alert("تعذّر", (e as Error).message),
  });

  const q = queue.data;
  const items = q?.items ?? [];
  const upcoming = items.filter((i) => i.status === "waiting" || i.status === "serving");

  return (
    <Screen padded={false} background="white">
      {/* رأس */}
      <View style={styles.header}>
        <View style={styles.logoFallback}>
          <Icon name="stethoscope" size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{clinic.name}</Text>
          <Text style={[styles.state, { color: clinic.is_open ? colors.success : colors.textMuted }]}>
            {clinic.is_open ? "● يستقبل الحجوزات" : "● مغلق"}
          </Text>
        </View>
        <Switch
          value={clinic.is_open}
          onValueChange={(v) => toggleOpen.mutate(v)}
          trackColor={{ true: colors.success, false: colors.border }}
          thumbColor="#fff"
        />
      </View>

      {/* بطاقة الجاري */}
      <View style={styles.nowCard}>
        <View style={{ flex: 1 }}>
          <Text style={styles.nowLabel}>يُخدَم الآن</Text>
          <Text style={styles.nowNumber}>{q?.now_serving ?? 0}</Text>
          <Text style={styles.waitingText}>{q?.waiting_count ?? 0} بالانتظار</Text>
        </View>
        <Pressable
          onPress={() => next.mutate()}
          disabled={next.isPending || upcoming.length === 0}
          style={({ pressed }) => [styles.nextBtn, (next.isPending || upcoming.length === 0) && { opacity: 0.5 }, pressed && { opacity: 0.85 }]}
        >
          <Icon name="checkCircle" size={20} color="#fff" />
          <Text style={styles.nextText}>استدعاء التالي</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>طابور اليوم</Text>

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={queue.isFetching && !queue.isLoading} onRefresh={() => queue.refetch()} tintColor={colors.accent} />}
        ListEmptyComponent={!queue.isLoading ? <EmptyState icon="🎫" title="لا حجوزات اليوم" hint="ستظهر حجوزات المرضى هنا فور وصولها" /> : null}
        renderItem={({ item }) => <QueueRow item={item} />}
      />
    </Screen>
  );
}

function QueueRow({ item }: { item: ClinicQueueItem }) {
  const color = STATUS_COLOR[item.status] ?? colors.textMuted;
  const dim = item.status === "done" || item.status === "cancelled";
  return (
    <View style={[styles.row, item.status === "serving" && styles.rowServing, dim && { opacity: 0.55 }]}>
      <View style={[styles.numCircle, { backgroundColor: color + "1A" }]}>
        <Text style={[styles.numText, { color }]}>{item.queue_number}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.patient} numberOfLines={1}>{item.patient_name || "مريض"}</Text>
        <Text style={[styles.statusText, { color }]}>{STATUS_LABEL[item.status] ?? item.status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  logoFallback: { width: 48, height: 48, borderRadius: radii.pill, backgroundColor: colors.accent + "16", alignItems: "center", justifyContent: "center" },
  name: { fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  state: { fontSize: fontSize.small, fontWeight: fontWeight.semibold, textAlign: "right", marginTop: 2 },

  nowCard: {
    flexDirection: "row-reverse", alignItems: "center", gap: spacing.md,
    marginHorizontal: spacing.lg, padding: spacing.lg,
    backgroundColor: colors.accent, borderRadius: radii.xxl, ...shadows.accent,
  },
  nowLabel: { fontSize: fontSize.small, color: "rgba(255,255,255,0.9)", fontWeight: fontWeight.semibold, textAlign: "right" },
  nowNumber: { fontSize: 52, fontWeight: fontWeight.extrabold, color: "#fff", lineHeight: 60, textAlign: "right" },
  waitingText: { fontSize: fontSize.small, color: "rgba(255,255,255,0.9)", textAlign: "right" },
  nextBtn: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: spacing.lg, height: 48, borderRadius: radii.pill },
  nextText: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.body },

  sectionTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right", paddingHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm },

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, backgroundColor: colors.background, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSoft, padding: spacing.md, ...shadows.sm },
  rowServing: { borderColor: colors.accent, backgroundColor: colors.accent + "0A" },
  numCircle: { width: 44, height: 44, borderRadius: radii.pill, alignItems: "center", justifyContent: "center" },
  numText: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold },
  patient: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  statusText: { fontSize: fontSize.small, fontWeight: fontWeight.semibold, textAlign: "right", marginTop: 1 },
});
