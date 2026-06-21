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
import * as ImagePicker from "expo-image-picker";
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

const VEHICLE_KEY: Record<string, string> = { moto: "partner.vehMoto", car: "partner.vehCar", bike: "partner.vehBike" };

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
  // هويّة شاشة "حسابي" تركوازية موحّدة (للزبون والسائق) — باقي تطبيق الزبون يبقى برتقالياً
  const brand = colors.accent;
  const brandSoft = colors.accent + "16";

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
    onError: (e) => Alert.alert(t("account.uploadError"), (e as Error).message),
  });

  const roleLabel = !user
    ? t("account.guest")
    : user.role === "driver"
      ? t("account.driver")
      : user.role === "merchant"
        ? t("account.merchant")
        : t("account.customer");
  const isCustomerOrGuest = !user || user.role === "customer";
  const displayName = p?.name?.trim() || roleLabel;
  const avatarPreview = cloudinaryThumb(p?.avatar_url, { w: 160 });

  const pickAvatar = async () => {
    if (uploading) return;
    // الوحدة الـ native قد تكون غائبة عن بناءٍ قديم (الدوالّ undefined)
    if (
      typeof ImagePicker.requestMediaLibraryPermissionsAsync !== "function" ||
      typeof ImagePicker.launchImageLibraryAsync !== "function"
    ) {
      Alert.alert(t("driver.needBuildTitle"), t("driver.needBuildMsg"));
      return;
    }
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t("account.permTitle"), t("account.permMsg"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });
      if (result.canceled) return;
      setUploading(true);
      const url = await uploadToCloudinary(result.assets[0].uri, "avatars");
      const next = await meApi.updateProfile({ avatar_url: url });
      queryClient.setQueryData(["me", "profile"], next);
    } catch (e) {
      Alert.alert(t("account.uploadError"), (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ===== بطاقة الهوية ===== */}
        {user ? (
          <View style={[styles.hero, { backgroundColor: brand }, shadows.accent]}>
            <View style={styles.heroBlob1} />
            <View style={styles.heroBlob2} />
            <View style={styles.heroContent}>
              <Pressable onPress={pickAvatar} style={styles.avatarRing}>
                <View style={styles.avatar}>
                  {avatarPreview ? (
                    <Image source={{ uri: avatarPreview }} style={styles.avatarImg} resizeMode="cover" />
                  ) : (
                    <Text style={[styles.avatarText, { color: brand }]}>{displayName.charAt(0)}</Text>
                  )}
                  {uploading ? (
                    <View style={styles.avatarOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  ) : null}
                </View>
                {!uploading ? (
                  <View style={styles.camBadge}>
                    <Icon name="camera" size={12} color={brand} />
                  </View>
                ) : null}
              </Pressable>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.heroName} numberOfLines={1}>{displayName}</Text>
                  <Pressable
                    hitSlop={8}
                    style={styles.editBtn}
                    onPress={() => {
                      setNameDraft(p?.name ?? "");
                      setEditing(true);
                    }}
                  >
                    <Icon name="edit" size={13} color="#fff" />
                  </Pressable>
                </View>
                {isDriver ? <Text style={styles.heroRoleTag}>{t("driver.roleTag")}</Text> : null}
                {isDriver && d ? (
                  <View style={styles.driverMeta}>
                    <View style={styles.heroChip}>
                      <Icon name="scooter" size={12} color="#fff" />
                      <Text style={styles.heroChipText}>{VEHICLE_KEY[d.vehicle_type] ? t(VEHICLE_KEY[d.vehicle_type]) : d.vehicle_type}</Text>
                    </View>
                    <View style={styles.heroChip}>
                      <Icon name="star" size={12} color="#fff" />
                      <Text style={styles.heroChipText}>{Number(d.rating || 0).toFixed(1)}</Text>
                    </View>
                    <View style={styles.heroChip}>
                      <Icon name="shield" size={12} color="#fff" />
                      <Text style={styles.heroChipText}>{d.is_verified ? t("driver.verified") : t("driver.pendingShort")}</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.heroSubRow}>
                    <Icon name="phone" size={12} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.heroSub} numberOfLines={1}>
                      {p?.phone ?? t("account.memberTag")}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => navigation.navigate("Connexion")}
            style={({ pressed }) => [
              styles.hero,
              { backgroundColor: brand },
              shadows.accent,
              pressed && styles.heroPressed,
            ]}
          >
            <View style={styles.heroBlob1} />
            <View style={styles.heroBlob2} />
            <View style={styles.heroContent}>
              <View style={styles.avatarRing}>
                <View style={styles.avatar}>
                  <Icon name="person" size={30} color={brand} />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroName} numberOfLines={1}>{t("account.guestHeroTitle")}</Text>
                <View style={styles.heroSubRow}>
                  <Icon name="phone" size={13} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.heroSub}>{t("account.guestHeroSub")}</Text>
                </View>
              </View>
              <Icon name="chevronLeft" size={22} color="rgba(255,255,255,0.95)" />
            </View>
          </Pressable>
        )}

        {/* ===== عناويني (الزبون) ===== */}
        {isCustomerOrGuest ? (
          <Pressable
            style={({ pressed }) => [styles.addressCard, pressed && { backgroundColor: colors.surfaceAlt }]}
            onPress={() => (user ? navigation.navigate("Addresses") : navigation.navigate("Connexion"))}
          >
            <View style={[styles.addressIcon, { backgroundColor: brandSoft }]}>
              <Icon name="location" size={20} color={brand} />
            </View>
            <Text style={styles.addressLabel}>{t("account.myAddresses")}</Text>
            <Icon name="chevronLeft" size={18} color={colors.textFaint} />
          </Pressable>
        ) : null}

        {/* تعديل الاسم */}
        <Modal visible={editing} transparent animationType="fade" onRequestClose={() => setEditing(false)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setEditing(false)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>{t("account.editName")}</Text>
              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder={t("account.namePlaceholder")}
                placeholderTextColor={colors.textFaint}
                style={styles.modalInput}
                textAlign="right"
                autoFocus
                maxLength={120}
              />
              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancel} onPress={() => setEditing(false)}>
                  <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
                </Pressable>
                <Pressable
                  style={[styles.modalSave, { backgroundColor: brand }]}
                  onPress={() => saveProfile.mutate({ name: nameDraft.trim() })}
                  disabled={saveProfile.isPending || !nameDraft.trim()}
                >
                  {saveProfile.isPending ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.modalSaveText}>{t("common.save")}</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* ===== الإعدادات ===== */}
        <Text style={styles.groupTitle}>{t("account.settings")}</Text>
        <View style={styles.group}>
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

        {/* ===== كن شريكاً (تسجيل جديد) — للضيف فقط، يُخفى بعد دخول الزبون ===== */}
        {!user ? (
          <>
            <Text style={styles.groupTitle}>{t("account.partnerSection")}</Text>
            <View style={styles.group}>
              <Row icon="store" tint={brandSoft} color={brand} label={t("partner.addStore")} sub={t("partner.addStoreSub")} onPress={() => navigation.navigate("Partner", { mode: "store" })} />
              <Divider />
              <Row icon="scooter" tint={colors.infoSoft} color={colors.info} label={t("partner.becomeDriver")} sub={t("partner.becomeDriverSub")} onPress={() => navigation.navigate("Partner", { mode: "driver" })} />
            </View>
          </>
        ) : null}

        {/* ===== دخول الشركاء (للضيف فقط) ===== */}
        {!user ? (
          <>
            <Text style={styles.groupTitle}>{t("account.partnerLogin")}</Text>
            <View style={styles.group}>
              <Row icon="store" tint={brandSoft} color={brand} label={t("account.loginStore")} sub={t("account.loginStoreSub")} onPress={() => navigation.navigate("Connexion", { role: "merchant" })} />
              <Divider />
              <Row icon="scooter" tint={colors.infoSoft} color={colors.info} label={t("account.loginDriver")} sub={t("account.loginDriverSub")} onPress={() => navigation.navigate("Connexion", { role: "driver" })} />
            </View>
          </>
        ) : null}

        {/* ===== حول الخدمة ===== */}
        <Text style={styles.groupTitle}>{t("account.more")}</Text>
        <View style={styles.group}>
          <Row icon="info" tint={colors.surface} color={colors.textMuted} label={t("account.about")} onPress={() => navigation.navigate("About")} />
          <Divider />
          <Row icon="feedback" tint={colors.surface} color={colors.textMuted} label={t("account.feedback")} onPress={() => navigation.navigate("Feedback")} />
        </View>

        {/* ===== تسجيل الخروج ===== */}
        {user ? (
          <Pressable style={({ pressed }) => [styles.logout, pressed && { opacity: 0.7 }]} onPress={signOut}>
            <Icon name="logout" size={18} color={colors.danger} />
            <Text style={styles.logoutText}>{t("account.signOut")}</Text>
          </Pressable>
        ) : null}

        {/* تذييل */}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>{t("app.name")}</Text>
          <Text style={styles.footerVersion}>{t("account.version")}</Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function Row({
  icon,
  tint,
  color,
  label,
  sub,
  value,
  onPress,
  right,
}: {
  icon: IconName;
  tint: string;
  color: string;
  label: string;
  sub?: string;
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
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
      </View>
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

  // بطاقة الهوية
  hero: {
    borderRadius: radii.xxl,
    padding: spacing.lg,
    overflow: "hidden",
  },
  heroPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  heroBlob1: {
    position: "absolute",
    top: -55,
    insetInlineEnd: -30,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  heroBlob2: {
    position: "absolute",
    bottom: -45,
    insetInlineStart: -25,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  heroContent: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  avatarRing: {
    width: 74,
    height: 74,
    borderRadius: radii.pill,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: 62,
    height: 62,
    borderRadius: radii.pill,
    backgroundColor: "#fff",
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
    bottom: -2,
    insetInlineStart: -2,
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  avatarText: { fontSize: 26, fontWeight: fontWeight.extrabold },
  nameRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  heroName: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: "#fff", textAlign: "right", flexShrink: 1 },
  editBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.22)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroRoleTag: { fontSize: fontSize.caption + 1, fontWeight: fontWeight.extrabold, letterSpacing: 1.5, color: "rgba(255,255,255,0.92)", textAlign: "right", marginTop: 2 },
  heroSubRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, marginTop: 4 },
  heroSub: { fontSize: fontSize.small, color: "rgba(255,255,255,0.9)", textAlign: "right", flexShrink: 1 },
  driverMeta: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, marginTop: spacing.sm },
  heroChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  heroChipText: { fontSize: fontSize.caption, fontWeight: fontWeight.bold, color: "#fff" },

  // عناويني
  addressCard: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.md,
    marginTop: spacing.md,
    ...shadows.sm,
  },
  addressIcon: { width: 40, height: 40, borderRadius: radii.md, alignItems: "center", justifyContent: "center" },
  addressLabel: { flex: 1, fontSize: fontSize.bodyLg, fontWeight: fontWeight.semibold, color: colors.text, textAlign: "right" },

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
  rowTextWrap: { flex: 1 },
  rowLabel: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.semibold, color: colors.text, textAlign: "right" },
  rowSub: { fontSize: fontSize.caption + 1, color: colors.textMuted, textAlign: "right", marginTop: 2 },
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

  footer: { alignItems: "center", marginTop: spacing.xl, gap: 2 },
  footerBrand: { fontSize: fontSize.body, fontWeight: fontWeight.extrabold, color: colors.textFaint, letterSpacing: 0.5 },
  footerVersion: { fontSize: fontSize.caption, color: colors.textFaint },

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
