import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { merchantsApi } from "../api/merchants";
import { appointmentsApi } from "../api/appointments";
import { cloudinaryThumb } from "../api/upload";
import type { Appointment, Merchant } from "../api/types";
import { Screen } from "../components/Screen";
import { EmptyState } from "../components/EmptyState";
import { Icon } from "../components/Icon";
import { useAuth } from "../auth/context";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Doctors">;

const ACCENT_SOFT = colors.accent + "16";

export function DoctorsScreen({ navigation }: Props) {
  const { user } = useAuth();

  const clinics = useQuery({
    queryKey: ["merchants", { type: "clinic" }],
    queryFn: () => merchantsApi.list({ type: "clinic" }),
    staleTime: 60_000,
  });

  const mine = useQuery({
    queryKey: ["appointments", "me"],
    queryFn: appointmentsApi.mine,
    enabled: !!user,
    refetchInterval: 20_000,
  });

  const active = mine.data ?? [];
  const list = clinics.data ?? [];

  return (
    <Screen padded={false} background="white">
      <View style={styles.header}>
        <Pressable hitSlop={8} style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="back" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>الأطباء والعيادات</Text>
          <Text style={styles.subtitle}>احجز موعدك بنظام الطابور الرقمي</Text>
        </View>
        <View style={styles.headIcon}>
          <Icon name="stethoscope" size={22} color={colors.accent} />
        </View>
      </View>

      <FlatList
        data={list}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={clinics.isFetching && !clinics.isLoading}
            onRefresh={() => { clinics.refetch(); mine.refetch(); }}
            tintColor={colors.accent}
          />
        }
        ListHeaderComponent={
          active.length > 0 ? (
            <View style={styles.mySection}>
              <Text style={styles.sectionTitle}>مواعيدي النشطة</Text>
              {active.map((a) => (
                <ActiveCard key={a.id} appt={a} onPress={() => navigation.navigate("MyTurn", { appointmentId: a.id })} />
              ))}
              <Text style={[styles.sectionTitle, { marginTop: spacing.lg }]}>العيادات والأطباء</Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          !clinics.isLoading ? (
            <EmptyState icon="🩺" title="لا توجد عيادات بعد" hint="ستظهر العيادات والأطباء هنا فور انضمامهم" />
          ) : null
        }
        renderItem={({ item }) => (
          <ClinicCard clinic={item} onPress={() => navigation.navigate("ClinicBook", { clinicId: item.id })} />
        )}
      />
    </Screen>
  );
}

function ActiveCard({ appt, onPress }: { appt: Appointment; onPress: () => void }) {
  const ahead = appt.queue?.ahead ?? 0;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.activeCard, pressed && { opacity: 0.92 }]}>
      <View style={styles.ticketIcon}>
        <Icon name="ticket" size={22} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.activeClinic} numberOfLines={1}>{appt.clinic_name ?? "عيادة"}</Text>
        <Text style={styles.activeMeta}>
          رقمك {appt.queue_number} · {ahead === 0 ? "دورك الآن أو التالي" : `أمامك ${ahead}`}
        </Text>
      </View>
      <View style={styles.bigNum}>
        <Text style={styles.bigNumText}>{appt.queue_number}</Text>
      </View>
    </Pressable>
  );
}

function ClinicCard({ clinic, onPress }: { clinic: Merchant; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.95 }]}>
      <View style={styles.avatar}>
        {clinic.logo_url ? (
          <Image source={{ uri: cloudinaryThumb(clinic.logo_url, { w: 200 })! }} style={styles.avatarImg} resizeMode="cover" />
        ) : (
          <Icon name="doctor" size={28} color={colors.accent} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.clinicName} numberOfLines={1}>{clinic.name}</Text>
        {clinic.description ? (
          <Text style={styles.specialty} numberOfLines={1}>{clinic.description}</Text>
        ) : null}
        <View style={styles.metaRow}>
          <View style={[styles.statePill, clinic.is_open ? styles.openPill : styles.closedPill]}>
            <Text style={[styles.stateText, { color: clinic.is_open ? colors.success : colors.textMuted }]}>
              {clinic.is_open ? "● مفتوح" : "● مغلق"}
            </Text>
          </View>
          {clinic.open_hours ? (
            <View style={styles.hoursChip}>
              <Icon name="clock" size={11} color={colors.textMuted} />
              <Text style={styles.hoursText}>{clinic.open_hours}</Text>
            </View>
          ) : null}
        </View>
      </View>
      <Icon name="chevronLeft" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  backBtn: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  title: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  subtitle: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  headIcon: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: ACCENT_SOFT, alignItems: "center", justifyContent: "center" },

  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xxxl, flexGrow: 1 },
  mySection: { marginBottom: spacing.md, gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right", marginBottom: spacing.xs },

  // بطاقة موعد نشط
  activeCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.accent + "0D",
    borderRadius: radii.xl,
    borderWidth: 1.5,
    borderColor: colors.accent + "44",
    padding: spacing.md,
  },
  ticketIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  activeClinic: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  activeMeta: { fontSize: fontSize.small, color: colors.accent, fontWeight: fontWeight.semibold, textAlign: "right", marginTop: 2 },
  bigNum: { width: 46, height: 46, borderRadius: radii.pill, backgroundColor: colors.accent + "1A", alignItems: "center", justifyContent: "center" },
  bigNumText: { fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, color: colors.accent },

  // بطاقة عيادة
  card: {
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
  avatar: { width: 56, height: 56, borderRadius: radii.pill, backgroundColor: ACCENT_SOFT, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarImg: { width: "100%", height: "100%" },
  clinicName: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  specialty: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 1 },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  statePill: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill },
  openPill: { backgroundColor: colors.successSoft },
  closedPill: { backgroundColor: colors.surface },
  stateText: { fontSize: fontSize.caption, fontWeight: fontWeight.bold },
  hoursChip: { flexDirection: "row-reverse", alignItems: "center", gap: 3 },
  hoursText: { fontSize: fontSize.caption + 1, color: colors.textMuted },
});
