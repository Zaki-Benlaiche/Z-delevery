import { useState } from "react";
import { Alert, FlatList, Modal, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { merchantsApi } from "../../api/merchants";
import type { Product } from "../../api/types";
import { Screen } from "../../components/Screen";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Avatar } from "../../components/Avatar";
import { EmptyState } from "../../components/EmptyState";
import { PriceTag } from "../../components/PriceTag";
import { Icon } from "../../components/Icon";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../../theme/colors";

export function MerchantProductsScreen() {
  const queryClient = useQueryClient();
  const store = useQuery({ queryKey: ["my-merchant"], queryFn: merchantsApi.mine, retry: false });
  const merchantId = store.data?.id;
  const products = store.data?.products ?? [];

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [desc, setDesc] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["my-merchant"] });

  const openAdd = () => {
    setEditing(null);
    setName(""); setPrice(""); setDesc("");
    setModalOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name);
    setPrice(String(p.price));
    setDesc(p.description ?? "");
    setModalOpen(true);
  };

  const save = useMutation({
    mutationFn: () => {
      const payload = { name: name.trim(), price: parseFloat(price.replace(",", ".")), description: desc.trim() || null };
      return editing
        ? merchantsApi.updateProduct(merchantId!, editing.id, payload)
        : merchantsApi.addProduct(merchantId!, payload);
    },
    onSuccess: () => {
      invalidate();
      setModalOpen(false);
    },
    onError: (e) => Alert.alert("تعذّر الحفظ", (e as Error).message),
  });

  const toggle = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) => merchantsApi.updateProduct(merchantId!, id, { available }),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: (id: string) => merchantsApi.deleteProduct(merchantId!, id),
    onSuccess: invalidate,
  });

  const submit = () => {
    if (!name.trim()) return Alert.alert("✋", "أدخل اسم المنتج");
    const p = parseFloat(price.replace(",", "."));
    if (Number.isNaN(p) || p < 0) return Alert.alert("✋", "أدخل سعراً صحيحاً");
    save.mutate();
  };

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Text style={styles.title}>منتجاتي</Text>
        <Pressable style={styles.addBtn} onPress={openAdd}>
          <Icon name="plus" size={18} color="#fff" />
          <Text style={styles.addBtnText}>إضافة</Text>
        </Pressable>
      </View>

      <FlatList
        data={products}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm + 2 }} />}
        ListEmptyComponent={
          !store.isLoading ? <EmptyState icon="🍽️" title="لا منتجات بعد" hint="أضف أوّل منتج ليظهر للزبائن" ctaLabel="إضافة منتج" onCta={openAdd} /> : null
        }
        renderItem={({ item }) => (
          <ProductRow
            product={item}
            onEdit={() => openEdit(item)}
            onToggle={(a) => toggle.mutate({ id: item.id, available: a })}
            onDelete={() =>
              Alert.alert("حذف المنتج", `حذف "${item.name}"؟`, [
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
            <Text style={styles.sheetTitle}>{editing ? "تعديل المنتج" : "منتج جديد"}</Text>
            <Input label="اسم المنتج" value={name} onChangeText={setName} placeholder="مثال: بيتزا مارغريتا" icon="🍽️" />
            <Input label="السعر (دج)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="مثال: 800" icon="💵" />
            <Input label="وصف (اختياري)" value={desc} onChangeText={setDesc} placeholder="مكوّنات أو تفاصيل" />
            <Button label={editing ? "حفظ التعديلات" : "حفظ المنتج"} onPress={submit} loading={save.isPending} size="lg" />
            <Button label="إلغاء" variant="ghost" onPress={() => setModalOpen(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function ProductRow({ product, onEdit, onToggle, onDelete }: { product: Product; onEdit: () => void; onToggle: (a: boolean) => void; onDelete: () => void }) {
  return (
    <Card variant="outlined" padding="sm" style={styles.row} onPress={onEdit}>
      <Avatar uri={product.image_url} fallback={product.name} size={56} shape="rounded" />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.pName} numberOfLines={1}>{product.name}</Text>
        <PriceTag amount={Number(product.price)} size="sm" />
        {!product.available ? <Text style={styles.unavailable}>غير متاح</Text> : null}
      </View>
      <View style={styles.rowRight}>
        <Switch value={product.available} onValueChange={onToggle} trackColor={{ true: colors.success, false: colors.border }} thumbColor="#fff" />
        <View style={styles.rowIcons}>
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
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  pName: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  unavailable: { fontSize: fontSize.caption, color: colors.danger, fontWeight: fontWeight.semibold, textAlign: "right" },
  rowRight: { alignItems: "center", gap: spacing.sm },
  rowIcons: { flexDirection: "row-reverse", gap: spacing.md },

  overlay: { flex: 1, backgroundColor: "rgba(15,23,42,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl, padding: spacing.xl, gap: spacing.md },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing.sm },
  sheetTitle: { fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
});
