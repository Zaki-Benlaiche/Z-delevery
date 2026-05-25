import { useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { addressesApi } from "../api/addresses";
import { ordersApi } from "../api/orders";
import type { Address, OrderCreatePayload } from "../api/types";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useCart, type CartLine } from "../store/cart";
import { colors } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Cart">;

export function CartScreen({ navigation }: Props) {
  const cart = useCart();
  const queryClient = useQueryClient();
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const addresses = useQuery({
    queryKey: ["addresses"],
    queryFn: addressesApi.list,
  });

  const placeOrder = useMutation({
    mutationFn: (payload: OrderCreatePayload) => ordersApi.create(payload),
    onSuccess: async (order) => {
      cart.clear();
      await queryClient.invalidateQueries({ queryKey: ["orders"] });
      navigation.replace("OrderTracking", { orderId: order.id });
    },
    onError: (e) => Alert.alert("تعذّر إنشاء الطلب", (e as Error).message),
  });

  if (cart.lines.length === 0) {
    return (
      <Screen>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>سلّتك فارغة</Text>
          <Text style={styles.emptyHint}>اختر متجراً وأضف منتجات لإكمال الطلب</Text>
        </View>
      </Screen>
    );
  }

  const submit = () => {
    if (!cart.merchantId) return;
    if (!selectedAddress) {
      Alert.alert("اختر عنوان التسليم", "لم تختر عنواناً بعد");
      return;
    }
    placeOrder.mutate({
      merchant_id: cart.merchantId,
      items: cart.lines.map((l) => ({
        product_id: l.product.id,
        qty: l.qty,
        options: l.options,
      })),
      payment_method: "cash",
      address_id: selectedAddress.id,
    });
  };

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.section}>منتجاتك</Text>
        {cart.lines.map((line) => (
          <CartRow key={line.product.id} line={line} />
        ))}

        <Text style={styles.section}>عنوان التسليم</Text>
        {addresses.isLoading ? (
          <Text style={styles.muted}>...جاري التحميل</Text>
        ) : (addresses.data ?? []).length === 0 ? (
          <View style={styles.emptyAddr}>
            <Text style={styles.muted}>ليست لديك عناوين محفوظة</Text>
            <Button
              label="إضافة عنوان"
              variant="secondary"
              onPress={() => navigation.navigate("AddAddress")}
            />
          </View>
        ) : (
          <FlatList
            data={addresses.data ?? []}
            keyExtractor={(a) => a.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.addrCard,
                  selectedAddress?.id === item.id && styles.addrCardActive,
                ]}
                onPress={() => setSelectedAddress(item)}
              >
                <Text style={styles.addrLabel}>{item.label}</Text>
                {item.details ? <Text style={styles.addrDetails}>{item.details}</Text> : null}
              </Pressable>
            )}
          />
        )}

        <View style={styles.summary}>
          <SummaryRow label="المجموع الفرعي" value={`${cart.subtotal().toFixed(0)} دج`} />
          <Text style={styles.note}>* رسوم التوصيل تُحسب بعد تأكيد العنوان</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={`أكّد الطلب — ${cart.subtotal().toFixed(0)} دج`}
          onPress={submit}
          loading={placeOrder.isPending}
        />
      </View>
    </Screen>
  );
}

function CartRow({ line }: { line: CartLine }) {
  const cart = useCart();
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowName}>{line.product.name}</Text>
        <Text style={styles.rowPrice}>{Number(line.product.price).toFixed(0)} دج × {line.qty}</Text>
      </View>
      <View style={styles.qtyRow}>
        <Pressable style={styles.qtyBtn} onPress={() => cart.setQty(line.product.id, line.qty - 1)}>
          <Text style={styles.qtyBtnText}>−</Text>
        </Pressable>
        <Text style={styles.qtyNum}>{line.qty}</Text>
        <Pressable style={styles.qtyBtn} onPress={() => cart.setQty(line.product.id, line.qty + 1)}>
          <Text style={styles.qtyBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.sumRow}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={styles.sumValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 100 },
  section: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    textAlign: "right",
    marginTop: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    padding: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  rowName: { fontSize: 14, fontWeight: "600", color: colors.text, textAlign: "right" },
  rowPrice: { fontSize: 13, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { color: "#fff", fontSize: 16, fontWeight: "700", lineHeight: 18 },
  qtyNum: { fontSize: 14, fontWeight: "700", minWidth: 16, textAlign: "center", color: colors.text },
  addrCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  addrCardActive: { borderColor: colors.primary, backgroundColor: "#FFF7F0" },
  addrLabel: { fontSize: 15, fontWeight: "700", color: colors.text, textAlign: "right" },
  addrDetails: { fontSize: 13, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  emptyAddr: { gap: 8 },
  muted: { color: colors.textMuted, textAlign: "right" },
  summary: { marginTop: 20, gap: 8 },
  sumRow: { flexDirection: "row", justifyContent: "space-between" },
  sumLabel: { color: colors.textMuted, fontSize: 14 },
  sumValue: { color: colors.text, fontSize: 14, fontWeight: "700" },
  note: { fontSize: 11, color: colors.textMuted, textAlign: "right" },
  footer: { position: "absolute", left: 16, right: 16, bottom: 16 },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: "700", color: colors.text },
  emptyHint: { fontSize: 14, color: colors.textMuted },
});
