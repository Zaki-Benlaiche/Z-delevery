import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Screen } from "../components/Screen";
import { Icon, type IconName } from "../components/Icon";
import { driversApi } from "../api/drivers";
import { meApi } from "../api/me";
import { uploadToCloudinary, cloudinaryThumb } from "../api/upload";
import { useAuth } from "../auth/context";
import { useT } from "../i18n";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";

const VEHICLE: Record<string, string> = { moto: "دراجة نارية", car: "سيّارة", bike: "دراجة هوائية" };

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "AccountTab">,
  NativeStackScreenProps<AppStackParamList>
>;
type Nav = Props["navigation"];

export function AccountScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const { t, lang, setLang } = useT();
  const queryClient = useQueryClient();
  const [notif, setNotif] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const isDriver = user?.role === "driver";
  const brand = isDriver ? colors.accent : colors.primary;
  const brandSoft = isDriver ? colors.accent + "16" : colors.primarySoft;

  const driverMe = useQuery({ queryKey: ["driver", "me"], queryFn: driversApi.me, enabled: isDriver, retry: false });
  const d = driverMe.data;

  const profile = useQuery({ queryKey: ["me", "profile"], queryFn: meApi.profile, enabled: !!user });
  const p = profile.data;

  const saveProfile = useMutation({
    mutationFn: meApi.updateProfile,
    onSuccess: (next) => {
      queryClient.setQueryData(["me", "profile"], next);
      setEditing(false);
    },
    onError: (e) => Alert.alert("تعذّر الحفظ", (e as Error).message),
  });

  const roleLabel = !user
    ? t("account.guest")
    : user.role === "driver"
      ? t("account.driver")
      : user.role === "merchant"
        ? "تاجر"
        : t("account.customer");
  const isCustomerOrGuest = !user || user.role === "customer";
  const displayName = p?.name?.trim() || roleLabel;
  const avatarPreview = cloudinaryThumb(p?.avatar_url, { w: 160 });

  const pickAvatar = async () => {
    if (uploading) return;
    let ImagePicker: typeof import("expo-image-picker");
    try {
      ImagePicker = await import("expo-image-picker");
    } catch {
      Alert.alert("غير متاح", "ميزة الصور تتطلّب تحديث التطبيق إلى أحدث إصدار.");
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("الإذن مطلوب", "اسمح بالوصول إلى الصور لاختيار صورة الملف.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (result.canceled) return;
    try {
      setUploading(true);
      const url = await uploadToCloudinary(result.assets[0].uri, "avatars");
      const next = await meApi.updateProfile({ avatar_url: url });
      queryClient.setQueryData(["me", "profile"], next);
    } catch (e) {
      Alert.alert("تعذّر رفع الصورة", (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* رأس الملف الشخصي */}
        <View style={styles.profile}>
          <Pressable
            onPress={user ? pickAvatar : undefined}
            style={[styles.avatar, { backgroundColor: brandSoft }]}
          >
            {avatarPreview ? (
              <Image source={{ uri: avatarPreview }} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <Text style={[styles.avatarText, { color: brand }]}>{displayName.charAt(0)}</Text>
            )}
            {uploading ? (
              <View style={styles.avatarOverlay}>
                <ActivityIndicator color="#fff" />
              </View>
            ) : user ? (
              <View style={[styles.camBadge, { backgroundColor: brand }]}>
                <Icon name="camera" size={12} color="#fff" />
              </View>
            ) : null}
          </Pressable>
          <View style={{ flex: 1 }}>
            <View style={styles.nameRow}>
              <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
              {user ? (
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    setNameDraft(p?.name ?? "");
                    setEditing(true);
                  }}
                >
                  <Icon name="edit" size={16} color={colors.textFaint} />
                </Pressable>
              ) : null}
            </View>
            {isDriver ? <Text style={[styles.roleTag, { color: brand }]}>LIVREUR</Text> : null}
            {isDriver && d ? (
              <View style={styles.driverMeta}>
                <Icon name="scooter" size={13} color={colors.textMuted} />
                <Text style={styles.profileSub}>{VEHICLE[d.vehicle_type] ?? d.vehicle_type}</Text>
                <View style={styles.metaSep} />
                <Icon name="star" size={13} color={colors.warning} />
                <Text style={styles.profileSub}>{Number(d.rating || 0).toFixed(1)}</Text>
                <View style={[styles.verifyChip, { backgroundColor: d.is_verified ? colors.successSoft : colors.warningSoft }]}>
                  <Text style={[styles.verifyText, { color: d.is_verified ? colors.success : colors.warning }]}>
                    {d.is_verified ? "موثّق" : "قيد التوثيق"}
                  </Text>
                </View>
              </View>
            ) : (
              <Text style={styles.profileSub}>
                {user ? (p?.phone ?? `#${user.user_id.slice(0, 8)}`) : t("account.loginPrompt")}
              </Text>
            )}
          </View>
        </View>

        {/* تعديل الاسم */}
        <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEditing(false)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>تعديل الاسم</Text>
              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="اكتب اسمك"
                placeholderTextColor={colors.textFaint}
                style={styles.modalInput}
                textAlign="right"
                autoFocus
                maxLength={120}
              />
              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancel} onPress={() => setEditing(false)}>
                  <Text style={styles.modalCancelText}>إلغاء</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSave, { backgroundColor: brand }]}
                  onPress={() => saveProfile.mutate({ name: nameDraft.trim() })}
                  disabled={saveProfile.isPending || !nameDraft.trim()}
                >
                  {saveProfile.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSaveText}>حفظ</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ===== الإعدادات ===== */}
        <Text style={styles.groupTitle}>{t("account.settings")}</Text>
        <View style={styles.group}>
          {isCustomerOrGuest ? (
            <>
              <Row icon="location" tint={colors.infoSoft} color={colors.info} label={t("account.myAddresses")} onPress={() => navigation.navigate("Addresses")} />
              <Divider />
            </>
          ) : null}
          <Row
            icon="bell"
            tint={colors.warningSoft}
            color={colors.warning}
            label={t("account.notifications")}
            right={<Switch value={notif} onValueChange={setNotif} trackColor={{ true: brand, false: colors.border }} thumbColor="#fff" />}
          />
          <Divider />
          <Row
            icon="globe"
            tint={colors.successSoft}
            color={colors.success}
            label={t("account.language")}
            value={lang === "ar" ? "🇩🇿 العربية" : "🇫🇷 Français"}
            onPress={() => setLang(lang === "ar" ? "fr" : "ar")}
          />
        </View>

        {/* ===== حول الخدمة ===== */}
        <Text style={styles.groupTitle}>{t("account.more")}</Text>
        <View style={styles.group}>
          <Row icon="info" tint={colors.surface} color={colors.textMuted} label={t("account.about")} onPress={() => Alert.alert(t("app.name"), t("account.aboutText"))} />
          {isCustomerOrGuest ? (
            <>
              <Divider />
              <Row icon="store" tint={colors.primarySoft} color={colors.primary} label={t("partner.addStore")} onPress={() => navigation.navigate("Partner", { mode: "store" })} />
              <Divider />
              <Row icon="scooter" tint="#EFF6FF" color={colors.info} label={t("partner.becomeDriver")} onPress={() => navigation.navigate("Partner", { mode: "driver" })} />
            </>
          ) : null}
          <Divider />
          <Row icon="feedback" tint={colors.surface} color={colors.textMuted} label={t("account.feedback")} onPress={() => Alert.alert(t("account.feedback"), t("account.feedbackText"))} />
        </View>

        {/* ===== الدخول/الخروج ===== */}
        {user ? (
          <Pressable style={styles.logout} onPress={signOut}>
            <Icon name="logout" size={18} color={colors.danger} />
            <Text style={styles.logoutText}>{t("account.signOut")}</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.loginCta, pressed && styles.loginCtaPressed]}
            onPress={() => navigation.navigate("Connexion")}
          >
            <View style={styles.loginCtaIcon}>
              <Icon name="person" size={22} color="#fff" />
            </View>
            <View style={styles.loginCtaTextWrap}>
              <Text style={styles.loginCtaTitle}>{t("account.loginCtaTitle")}</Text>
              <Text style={styles.loginCtaSub}>{t("account.loginPrompt")}</Text>
            </View>
            <Icon name="chevronLeft" size={20} color="rgba(255,255,255,0.9)" />
          </Pressable>
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({
  icon,
  tint,
  color,
  label,
  value,
  onPress,
  right,
}: {
  icon: IconName;
  tint: string;
  color: string;
  label: string;
  value?: string;
  onPress?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && onPress && { backgroundColor: colors.surfaceAlt }]}
      onPress={onPress}
      disabled={!onPress && !right}
    >
      <View style={[styles.rowIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={19} color={color} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      {right ?? (onPress ? <Icon name="chevronLeft" size={18} color={colors.textFaint} /> : null)}
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },

  profile: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, marginBottom: spacing.xl },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  camBadge: {
    position: "absolute",
    bottom: 0,
    insetInlineStart: 0,
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.canvas,
  },
  avatarText: { fontSize: 26, fontWeight: fontWeight.extrabold, color: colors.primary },
  nameRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  profileName: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right", flexShrink: 1 },
  roleTag: { fontSize: fontSize.caption + 1, fontWeight: fontWeight.extrabold, letterSpacing: 1.5, textAlign: "right", marginTop: 1 },
  profileSub: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  driverMeta: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  metaSep: { width: 1, height: 11, backgroundColor: colors.border, marginHorizontal: 2 },
  verifyChip: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radii.pill, marginInlineStart: spacing.xs },
  verifyText: { fontSize: fontSize.caption, fontWeight: fontWeight.bold },

  groupTitle: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textAlign: "right",
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  group: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderSoft,
    ...shadows.sm,
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  rowIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  rowLabel: { flex: 1, fontSize: fontSize.bodyLg, fontWeight: fontWeight.semibold, color: colors.text, textAlign: "right" },
  rowValue: { fontSize: fontSize.small, color: colors.textMuted, marginInlineEnd: spacing.xs },
  divider: { height: 1, backgroundColor: colors.divider, marginInlineStart: 68 },

  logout: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.dangerSoft,
  },
  logoutText: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold, color: colors.danger },

  loginCta: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.xl,
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
  loginCtaPressed: { opacity: 0.9, transform: [{ scale: 0.985 }] },
  loginCtaIcon: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  loginCtaTextWrap: { flex: 1 },
  loginCtaTitle: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.extrabold,
    color: "#fff",
    textAlign: "right",
  },
  loginCtaSub: {
    fontSize: fontSize.small,
    color: "rgba(255,255,255,0.85)",
    textAlign: "right",
    marginTop: 2,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.5)",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
  },
  modalCard: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.lg,
  },
  modalTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  modalInput: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 50,
    fontSize: fontSize.bodyLg,
    color: colors.text,
  },
  modalActions: { flexDirection: "row-reverse", gap: spacing.sm },
  modalSave: { flex: 1, height: 46, borderRadius: radii.lg, alignItems: "center", justifyContent: "center" },
  modalSaveText: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.body },
  modalCancel: { flex: 1, height: 46, borderRadius: radii.lg, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  modalCancelText: { color: colors.textMuted, fontWeight: fontWeight.bold, fontSize: fontSize.body },
});
