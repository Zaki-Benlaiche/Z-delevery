import { useState } from "react";
import { Alert, FlatList, Modal, Pressable, RefreshControl, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { merchantsApi } from "../../api/merchants";
import { appointmentsApi } from "../../api/appointments";
import type { ClinicQueue, ClinicQueueItem, MerchantDetail } from "../../api/types";
import { Screen } from "../../components/Screen";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../../theme/colors";

export function DoctorQueueScreen({ clinic }: { clinic: MerchantDetail }) {
  const queryClient = useQueryClient();
  const [acceptTarget, setAcceptTarget] = useState<ClinicQueueItem | null>(null);
  const [numInput, setNumInput] = useState("");

  const queue = useQuery({
    queryKey: ["clinic-queue", clinic.id],
    queryFn: () => appointmentsApi.queue(clinic.id),
    refetchInterval: 8000,
    placeholderData: (p) => p,
  });
  const q = queue.data;
  const current = q?.current_number ?? 0;
  const requests = q?.requests ?? [];
  const waiting = q?.waiting ?? [];

  const setData = (data: ClinicQueue) => queryClient.setQueryData(["clinic-queue", clinic.id], data);

  const toggleOpen = useMutation({
    mutationFn: (open: boolean) => merchantsApi.update(clinic.id, { is_open: open }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-merchant"] }),
  });
  const setCurrent = useMutation({
    mutationFn: (n?: number) => appointmentsApi.setCurrent(clinic.id, n),
    onSuccess: setData,
    onError: (e) => Alert.alert("تعذّر", (e as Error).message),
  });
  const accept = useMutation({
    mutationFn: ({ id, number }: { id: string; number?: number }) => appointmentsApi.accept(clinic.id, id, number),
    onSuccess: (data) => { setData(data); setAcceptTarget(null); },
    onError: (e) => Alert.alert("تعذّر القبول", (e as Error).message),
  });
  const reject = useMutation({
    mutationFn: (id: string) => appointmentsApi.reject(clinic.id, id),
    onSuccess: setData,
    onError: (e) => Alert.alert("تعذّر", (e as Error).message),
  });

  const suggested = Math.max(current, ...waiting.map((w) => w.queue_number), 0) + 1;
  const openAccept = (item: ClinicQueueItem) => { setAcceptTarget(item); setNumInput(String(suggested)); };
  const confirmAccept = () => {
    const n = parseInt(numInput, 10);
    accept.mutate({ id: acceptTarget!.id, number: Number.isNaN(n) ? undefined : n });
  };

  return (
    <Screen padded={false} background="white">
      {/* رأس */}
      <View style={styles.header}>
        <View style={styles.logoFallback}><Icon name="stethoscope" size={22} color={colors.accent} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={1}>{clinic.name}</Text>
          <Text style={[styles.state, { color: clinic.is_open ? colors.success : colors.textMuted }]}>
            {clinic.is_open ? "● يستقبل الطلبات" : "● مغلق"}
          </Text>
        </View>
        <Switch value={clinic.is_open} onValueChange={(v) => toggleOpen.mutate(v)} trackColor={{ true: colors.success, false: colors.border }} thumbColor="#fff" />
      </View>

      <FlatList
        data={waiting}
        keyExtractor={(i) => i.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={queue.isFetching && !queue.isLoading} onRefresh={() => queue.refetch()} tintColor={colors.accent} />}
        ListHeaderComponent={
          <View style={{ gap: spacing.lg, marginBottom: spacing.md }}>
            {/* عدّاد الرقم الحالي */}
            <View style={styles.counter}>
              <Text style={styles.counterLabel}>الرقم الحالي (يُخدَم الآن)</Text>
              <View style={styles.counterRow}>
                <Pressable style={styles.stepBtn} onPress={() => setCurrent.mutate(Math.max(0, current - 1))} disabled={setCurrent.isPending}>
                  <Icon name="minus" size={22} color="#fff" />
                </Pressable>
                <Text style={styles.counterNum}>{current}</Text>
                <Pressable style={[styles.stepBtn, styles.stepPlus]} onPress={() => setCurrent.mutate(undefined)} disabled={setCurrent.isPending}>
                  <Icon name="plus" size={22} color="#fff" />
                </Pressable>
              </View>
              <Text style={styles.counterHint}>اضغط + لاستدعاء التالي — يشمل مرضى الحضور</Text>
            </View>

            {/* طلبات جديدة */}
            {requests.length > 0 ? (
              <View style={{ gap: spacing.sm }}>
                <Text style={styles.sectionTitle}>طلبات جديدة ({requests.length})</Text>
                {requests.map((r) => (
                  <View key={r.id} style={styles.reqRow}>
                    <View style={styles.reqIcon}><Icon name="person" size={18} color={colors.warning} /></View>
                    <Text style={styles.reqName} numberOfLines={1}>{r.patient_name || "مريض"}</Text>
                    <Pressable style={styles.rejectBtn} onPress={() => reject.mutate(r.id)}><Icon name="close" size={16} color={colors.danger} /></Pressable>
                    <Pressable style={styles.acceptBtn} onPress={() => openAccept(r)}>
                      <Icon name="check" size={15} color="#fff" />
                      <Text style={styles.acceptText}>قبول</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>في الطابور ({waiting.length})</Text>
          </View>
        }
        ListEmptyComponent={!queue.isLoading ? <EmptyState icon="🎫" title="لا أحد في الطابور" hint="اقبل الطلبات الجديدة لإضافتهم للطابور" /> : null}
        renderItem={({ item }) => {
          const isCurrent = item.queue_number === current;
          const passed = item.queue_number < current;
          return (
            <View style={[styles.row, isCurrent && styles.rowCurrent, passed && { opacity: 0.5 }]}>
              <View style={[styles.numCircle, isCurrent && { backgroundColor: colors.accent }]}>
                <Text style={[styles.numText, isCurrent && { color: "#fff" }]}>{item.queue_number}</Text>
              </View>
              <Text style={styles.patient} numberOfLines={1}>{item.patient_name || "مريض"}</Text>
              {isCurrent ? <Text style={styles.nowTag}>الآن</Text> : null}
            </View>
          );
        }}
      />

      {/* نافذة تعيين الرقم */}
      <Modal visible={!!acceptTarget} transparent animationType="fade" onRequestClose={() => setAcceptTarget(null)}>
        <Pressable style={styles.backdrop} onPress={() => setAcceptTarget(null)}>
          <Pressable style={styles.modal} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>أعطِ رقماً للمريض</Text>
            <Text style={styles.modalSub}>{acceptTarget?.patient_name || "مريض"}</Text>
            <TextInput
              value={numInput}
              onChangeText={setNumInput}
              keyboardType="number-pad"
              style={styles.modalInput}
              textAlign="center"
              autoFocus
            />
            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setAcceptTarget(null)}>
                <Text style={styles.modalCancelText}>إلغاء</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={confirmAccept} disabled={accept.isPending}>
                <Text style={styles.modalConfirmText}>تأكيد الرقم</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  logoFallback: { width: 48, height: 48, borderRadius: radii.pill, backgroundColor: colors.accent + "16", alignItems: "center", justifyContent: "center" },
  name: { fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  state: { fontSize: fontSize.small, fontWeight: fontWeight.semibold, textAlign: "right", marginTop: 2 },

  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },

  counter: { backgroundColor: colors.accent, borderRadius: radii.xxl, padding: spacing.lg, alignItems: "center", gap: spacing.sm, ...shadows.accent },
  counterLabel: { fontSize: fontSize.small, color: "rgba(255,255,255,0.9)", fontWeight: fontWeight.semibold },
  counterRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xl },
  counterNum: { fontSize: 56, fontWeight: fontWeight.extrabold, color: "#fff", minWidth: 80, textAlign: "center" },
  stepBtn: { width: 52, height: 52, borderRadius: radii.pill, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  stepPlus: { backgroundColor: "rgba(255,255,255,0.32)" },
  counterHint: { fontSize: fontSize.caption + 1, color: "rgba(255,255,255,0.85)" },

  sectionTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },

  reqRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, backgroundColor: colors.warningSoft, borderRadius: radii.lg, padding: spacing.sm + 2 },
  reqIcon: { width: 38, height: 38, borderRadius: radii.pill, backgroundColor: "rgba(245,158,11,0.18)", alignItems: "center", justifyContent: "center" },
  reqName: { flex: 1, fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  rejectBtn: { width: 38, height: 38, borderRadius: radii.md, backgroundColor: colors.dangerSoft, alignItems: "center", justifyContent: "center" },
  acceptBtn: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, backgroundColor: colors.success, paddingHorizontal: spacing.md, height: 38, borderRadius: radii.md },
  acceptText: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.small },

  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, backgroundColor: colors.background, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.borderSoft, padding: spacing.md, ...shadows.sm },
  rowCurrent: { borderColor: colors.accent, backgroundColor: colors.accent + "0A" },
  numCircle: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  numText: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text },
  patient: { flex: 1, fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  nowTag: { fontSize: fontSize.small, fontWeight: fontWeight.extrabold, color: colors.accent },

  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "center", paddingHorizontal: spacing.xl },
  modal: { backgroundColor: colors.background, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md, ...shadows.lg },
  modalTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  modalSub: { fontSize: fontSize.body, color: colors.textMuted, textAlign: "right" },
  modalInput: { backgroundColor: colors.surface, borderRadius: radii.lg, borderWidth: 1.5, borderColor: colors.accent, height: 64, fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.text },
  modalActions: { flexDirection: "row-reverse", gap: spacing.sm },
  modalConfirm: { flex: 1, height: 48, borderRadius: radii.lg, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  modalConfirmText: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.body },
  modalCancel: { flex: 1, height: 48, borderRadius: radii.lg, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  modalCancelText: { color: colors.textMuted, fontWeight: fontWeight.bold, fontSize: fontSize.body },
});
