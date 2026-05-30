import { useState } from "react";
import {
  Alert,
  FlatList,
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
import { Card } from "../components/Card";
import { EmptyState } from "../components/EmptyState";
import { PriceTag } from "../components/PriceTag";
import { QuantityStepper } from "../components/QuantityStepper";
import { useCart, type CartLine } from "../store/cart";
import { colors, fontSize, fontWeight, spacing } from "../theme/colors";
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
        <EmptyState
          icon="🛒"
          title="سلّتك فارغة"
          hint="اختر متجراً وأضف منتجات لإكمال الطلب"
          ctaLabel="تصفّح المتاجر"
          onCta={() => navigation.goBack()}
        />
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
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            renderItem={({ item }) => {
              const active = selectedAddress?.id === item.id;
              return (
                <Card
                  variant="outlined"
                  padding="sm"
                  onPress={() => setSelectedAddress(item)}
                  style={active ? styles.addrCardActive : undefined}
                >
                  <Text style={styles.addrLabel}>{item.label}</Text>
                  {item.details ? <Text style={styles.addrDetails}>{item.details}</Text> : null}
                </Card>
              );
            }}
          />
        )}

        <View style={styles.summary}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>المجموع الفرعي</Text>
            <PriceTag amount={cart.subtotal()} size="md" />
          </View>
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
    <Card variant="outlined" padding="sm" style={styles.row}>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={styles.rowName}>{line.product.name}</Text>
        <View style={styles.unitRow}>
          <PriceTag amount={Number(line.product.price)} size="sm" muted />
          <Text style={styles.times}>× {line.qty}</Text>
        </View>
      </View>
      <QuantityStepper
        value={line.qty}
        variant="compact"
        min={1}
        onMinus={() => cart.setQty(line.product.id, line.qty - 1)}
        onPlus={() => cart.setQty(line.product.id, line.qty + 1)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: 100 },
  section: {
    fontSize: fontSize.bodyLg,
    fontWeight: fontWeight.bold,
    color: colors.text,
    textAlign: "right",
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    marginBottom: spacing.sm,
  },
  rowName: { fontSize: fontSize.small + 1, fontWeight: fontWeight.semibold, color: colors.text, textAlign: "right" },
  unitRow: { flexDirection: "row", alignItems: "baseline", gap: spacing.xs, justifyContent: "flex-end" },
  times: { fontSize: fontSize.small, color: colors.textMuted },
  addrCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  addrLabel: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  addrDetails: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  emptyAddr: { gap: spacing.sm },
  muted: { color: colors.textMuted, textAlign: "right" },
  summary: { marginTop: spacing.xl, gap: spacing.sm },
  sumRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sumLabel: { color: colors.textMuted, fontSize: fontSize.small + 1 },
  note: { fontSize: fontSize.caption, color: colors.textMuted, textAlign: "right" },
  footer: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg },
});
