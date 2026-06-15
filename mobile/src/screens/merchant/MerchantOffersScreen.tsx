import { useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { offersApi } from "../../api/offers";
import type { Offer } from "../../api/types";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { EmptyState } from "../../components/EmptyState";
import { Icon } from "../../components/Icon";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../../theme/colors";

export function MerchantOffersScreen() {
  const queryClient = useQueryClient();
  const offers = useQuery({ queryKey: ["offers", "mine"], queryFn: offersApi.mine, retry: false });

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [discount, setDiscount] = useState("");
  const [badge, setBadge] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["offers", "mine"] });

  const openAdd = () => {
    setEditing(null);
    setTitle(""); setSubtitle(""); setDiscount(""); setBadge("");
    setModalOpen(true);
  };
  const openEdit = (o: Offer) => {
    setEditing(o);
    setTitle(o.title);
    setSubtitle(o.subtitle ?? "");
    setDiscount(o.discount_pct ? String(o.discount_pct) : "");
    setBadge(o.badge_text ?? "");
    setModalOpen(true);
  };

  const save = useMutation({
    mutationFn: () => {
      const d = parseInt(discount, 10);
      const body = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        discount_pct: Number.isNaN(d) ? null : Math.min(100, Math.max(1, d)),
        badge_text: badge.trim() || null,
      };
      return editing ? offersApi.update(editing.id, body) : offersApi.create({ ...body, is_active: true });
    },
    onSuccess: () => { invalidate(); setModalOpen(false); },
    onError: (e) => Alert.alert("تعذّر الحفظ", (e as Error).message),
  });

  const toggle = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => offersApi.update(id, { is_active }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => offersApi.remove(id),
    onSuccess: invalidate,
  });

  const submit = () => {
    if (!title.trim()) return Alert.alert("✋", "أدخل عنوان العرض");
    save.mutate();
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>العروض</Text>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Icon name="plus" size={18} color="#fff" />
          <Text style={styles.addBtnText}>عرض جديد</Text>
        </Pressable>
      </View>

      <FlatList
        data={offers.data ?? []}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListEmptyComponent={
          !offers.isLoading ? <EmptyState icon="🎟️" title="لا عروض بعد" hint="أنشئ عرضاً ترويجياً ليظهر للزبائن في الرئيسية" ctaLabel="إنشاء عرض" onCta={openAdd} /> : null
        }
        renderItem={({ item }) => (
          <OfferCard
            offer={item}
            onEdit={() => openEdit(item)}
            onToggle={(a) => toggle.mutate({ id: item.id, is_active: a })}
            onDelete={() =>
              Alert.alert("حذف العرض", `حذف "${item.title}"؟`, [
                { text: "إلغاء", style: "cancel" },
                { text: "حذف", style: "destructive", onPress: () => remove.mutate(item.id) },
              ])
            }
          />
        )}
      />

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{editing ? "تعديل العرض" : "عرض جديد"}</Text>
            <Input label="عنوان العرض" value={title} onChangeText={setTitle} placeholder="مثال: خصم نهاية الأسبوع" icon="🎟️" />
            <Input label="وصف (اختياري)" value={subtitle} onChangeText={setSubtitle} placeholder="مثال: على كل البيتزا" />
            <Input label="نسبة الخصم % (اختياري)" value={discount} onChangeText={setDiscount} keyboardType="number-pad" placeholder="مثال: 20" maxLength={3} />
            <Input label="شارة (اختياري)" value={badge} onChangeText={setBadge} placeholder="مثال: جديد" maxLength={40} />
            <Button label={editing ? "حفظ التعديلات" : "نشر العرض"} onPress={submit} loading={save.isPending} size="lg" />
            <Button label="إلغاء" variant="ghost" onPress={() => setModalOpen(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function OfferCard({ offer, onEdit, onToggle, onDelete }: { offer: Offer; onEdit: () => void; onToggle: (a: boolean) => void; onDelete: () => void }) {
  return (
    <Card variant="elevated" padding="md" style={{ gap: spacing.sm }} onPress={onEdit}>
      <View style={styles.offerTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.offerTitle} numberOfLines={1}>{offer.title}</Text>
          {offer.subtitle ? <Text style={styles.offerSub} numberOfLines={1}>{offer.subtitle}</Text> : null}
        </View>
        {offer.discount_pct ? (
          <View style={styles.discBadge}><Text style={styles.discText}>{offer.discount_pct}%</Text></View>
        ) : null}
      </View>
      <View style={styles.offerFoot}>
        <View style={styles.activeWrap}>
          <Switch value={offer.is_active} onValueChange={onToggle} trackColor={{ true: colors.success, false: colors.border }} thumbColor="#fff" />
          <Text style={[styles.activeText, { color: offer.is_active ? colors.success : colors.textMuted }]}>
            {offer.is_active ? "مفعّل" : "متوقّف"}
          </Text>
        </View>
        <View style={styles.offerIcons}>
          <Pressable hitSlop={8} onPress={onEdit}><Icon name="edit" size={19} color={colors.textMuted} /></Pressable>
          <Pressable hitSlop={8} onPress={onDelete}><Icon name="trash" size={19} color={colors.danger} /></Pressable>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  title: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.text },
  addBtn: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radii.pill, ...shadows.primary },
  addBtnText: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.small },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },

  offerTop: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  offerTitle: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  offerSub: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  discBadge: { backgroundColor: colors.primarySoft, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radii.pill },
  discText: { color: colors.primary, fontWeight: fontWeight.extrabold, fontSize: fontSize.body },
  offerFoot: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  activeWrap: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  activeText: { fontSize: fontSize.small, fontWeight: fontWeight.semibold },
  offerIcons: { flexDirection: "row-reverse", gap: spacing.md },

  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, padding: spacing.xl, gap: spacing.md },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.sm },
  sheetTitle: { fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
});
