import { useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { merchantsApi } from "../../api/merchants";
import type { MerchantType } from "../../api/types";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Icon } from "../../components/Icon";
import { ImageUploadField } from "../../components/ImageUploadField";
import { CLOUDINARY_ENABLED } from "../../config";
import { colors, fontSize, fontWeight, radii, spacing } from "../../theme/colors";

const TYPE_LABEL: Record<MerchantType, string> = {
  food: "مطعم / طعام",
  fresh: "خضار وفواكه",
  market: "بقالة / سوق",
};

export function MerchantSettingsScreen({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const store = useQuery({ queryKey: ["my-merchant"], queryFn: merchantsApi.mine, retry: false });
  const s = store.data;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [openHours, setOpenHours] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  // مزامنة الحقول مع بيانات المتجر عند الفتح
  useEffect(() => {
    if (visible && s) {
      setName(s.name ?? "");
      setDescription(s.description ?? "");
      setOpenHours(s.open_hours ?? "");
      setIsOpen(s.is_open ?? false);
    }
  }, [visible, s]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["my-merchant"] });

  const save = useMutation({
    mutationFn: () =>
      merchantsApi.update(s!.id, {
        name: name.trim(),
        description: description.trim() || null,
        open_hours: openHours.trim() || null,
        is_open: isOpen,
      }),
    onSuccess: () => {
      invalidate();
      onClose();
    },
    onError: (e) => Alert.alert("تعذّر الحفظ", (e as Error).message),
  });

  const setLogo = useMutation({
    mutationFn: (url: string) => merchantsApi.update(s!.id, { logo_url: url }),
    onSuccess: invalidate,
    onError: (e) => Alert.alert("تعذّر حفظ الشعار", (e as Error).message),
  });

  const submit = () => {
    if (!name.trim()) return Alert.alert("✋", "أدخل اسم المتجر");
    save.mutate();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.headerRow}>
            <Text style={styles.sheetTitle}>إعدادات المتجر</Text>
            <Pressable hitSlop={8} onPress={onClose}>
              <Icon name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: spacing.md, paddingBottom: spacing.lg }}>
            {CLOUDINARY_ENABLED && s ? (
              <View style={{ alignItems: "center" }}>
                <ImageUploadField
                  value={s.logo_url}
                  onChange={(url) => setLogo.mutate(url)}
                  shape="circle"
                  size={96}
                  label="شعار المتجر"
                  folder="zdelivry/logos"
                />
              </View>
            ) : null}

            <Input label="اسم المتجر" value={name} onChangeText={setName} placeholder="مثال: مطعم النخيل" icon="🏪" />
            <Input label="وصف المتجر (اختياري)" value={description} onChangeText={setDescription} placeholder="نبذة قصيرة عن متجرك" multiline />
            <Input label="ساعات العمل (اختياري)" value={openHours} onChangeText={setOpenHours} placeholder="مثال: 09:00 - 23:00" icon="🕐" />

            {/* نوع المتجر (للعرض فقط) */}
            {s ? (
              <View style={styles.typeBox}>
                <Text style={styles.typeLabel}>نوع المتجر</Text>
                <Text style={styles.typeValue}>{TYPE_LABEL[s.type] ?? s.type}</Text>
              </View>
            ) : null}

            {/* حالة الفتح */}
            <View style={styles.openRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.openLabel}>المتجر مفتوح للطلبات</Text>
                <Text style={styles.openSub}>{isOpen ? "● يستقبل الطلبات الآن" : "● مغلق — لن تصل طلبات جديدة"}</Text>
              </View>
              <Switch value={isOpen} onValueChange={setIsOpen} trackColor={{ true: colors.success, false: colors.border }} thumbColor="#fff" />
            </View>

            <Button label="حفظ التغييرات" onPress={submit} loading={save.isPending} size="lg" />
            <Button label="إلغاء" variant="ghost" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, padding: spacing.xl, gap: spacing.md, maxHeight: "92%" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.sm },
  headerRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  sheetTitle: { fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },

  typeBox: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md },
  typeLabel: { fontSize: fontSize.small, color: colors.textMuted },
  typeValue: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text },

  openRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.md },
  openLabel: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  openSub: { fontSize: fontSize.caption, color: colors.textMuted, textAlign: "right", marginTop: 2 },
});
