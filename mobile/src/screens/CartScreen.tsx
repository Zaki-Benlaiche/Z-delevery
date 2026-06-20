import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { addressesApi } from "../api/addresses";
import { ordersApi } from "../api/orders";
import type { Address, OrderCreatePayload, PaymentMethod } from "../api/types";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { Input } from "../components/Input";
import { EmptyState } from "../components/EmptyState";
import { PriceTag } from "../components/PriceTag";
import { QuantityStepper } from "../components/QuantityStepper";
import { Segmented } from "../components/Segmented";
import { useAuth } from "../auth/context";
import { useCurrentLocation } from "../hooks/useLocation";
import { useCart, type CartLine } from "../store/cart";
import { isValidDzPhone, normalizeDzPhone } from "../utils/phone";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Cart">;

export function CartScreen({ navigation }: Props) {
  const cart = useCart();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { user, quickSignIn } = useAuth();
  const loc = useCurrentLocation();
  const isGuest = !user;

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [payment, setPayment] = useState<PaymentMethod>("cash");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestAddress, setGuestAddress] = useState("");
  const [registering, setRegistering] = useState(false);

  const addresses = useQuery({
    queryKey: ["addresses"],
    queryFn: addressesApi.list,
    enabled: !isGuest,
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
      <Screen background="white">
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

  const items = () =>
    cart.lines.map((l) => ({ product_id: l.product.id, qty: l.qty, options: l.options }));

  const submit = async () => {
    if (!cart.merchantId) return;

    if (isGuest) {
      if (!isValidDzPhone(guestPhone)) {
        Alert.alert("أدخل رقم هاتفك", "نحتاج رقمك للتواصل بشأن الطلب");
        return;
      }
      if (!guestAddress.trim()) {
        Alert.alert("أدخل عنوان التسليم", "اكتب وصف مكان التسليم");
        return;
      }
      try {
        setRegistering(true);
        await quickSignIn(normalizeDzPhone(guestPhone), guestName.trim() || undefined);
      } catch (e) {
        setRegistering(false);
        Alert.alert("تعذّر إتمام الطلب", (e as Error).message);
        return;
      }
      setRegistering(false);
      placeOrder.mutate({
        merchant_id: cart.merchantId,
        items: items(),
        payment_method: payment,
        lat: loc.location?.lat,
        lng: loc.location?.lng,
        delivery_details: guestAddress.trim(),
      });
      return;
    }

    if (!selectedAddress) {
      Alert.alert("اختر عنوان التسليم", "لم تختر عنواناً بعد");
      return;
    }
    placeOrder.mutate({
      merchant_id: cart.merchantId,
      items: items(),
      payment_method: payment,
      address_id: selectedAddress.id,
    });
  };

  const addrList = addresses.data ?? [];

  return (
    <Screen padded={false} background="canvas">
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== المنتجات ===== */}
        <SectionHeader title="منتجاتك" badge={`${cart.count()}`} />
        <View style={styles.group}>
          {cart.lines.map((line) => (
            <CartRow key={line.product.id} line={line} />
          ))}
        </View>

        {isGuest ? (
          <>
            {/* ===== بيانات الضيف ===== */}
            <SectionHeader title="بياناتك" />
            <View style={styles.guestBox}>
              <Input
                label="رقم الهاتف"
                value={guestPhone}
                onChangeText={(t) => setGuestPhone(t.replace(/[^\d]/g, ""))}
                keyboardType="phone-pad"
                placeholder="555 12 34 56"
                iconName="phone"
                prefix="+213"
                style={styles.phoneInput}
                maxLength={12}
              />
              <Input
                label="الاسم (اختياري)"
                value={guestName}
                onChangeText={setGuestName}
                placeholder="مثال: زكريا"
                icon="🙂"
              />
            </View>

            {/* ===== عنوان التسليم ===== */}
            <SectionHeader title="عنوان التسليم" />
            <View style={styles.guestBox}>
              <Input
                value={guestAddress}
                onChangeText={setGuestAddress}
                placeholder="مثال: حي النصر، عمارة 5، الطابق 2"
                icon="📍"
                multiline
                hint="نستخدم موقعك الحالي لتحديد مكان التسليم بدقّة"
              />
            </View>
          </>
        ) : (
          <>
            {/* ===== عنوان التسليم ===== */}
            <SectionHeader title="عنوان التسليم" />
            {addresses.isLoading ? (
              <Text style={styles.muted}>…جارٍ التحميل</Text>
            ) : addrList.length === 0 ? (
              <Card variant="outlined" padding="md" style={styles.emptyAddr}>
                <Text style={styles.muted}>📍 ليست لديك عناوين محفوظة بعد</Text>
                <Button
                  label="إضافة عنوان"
                  variant="secondary"
                  size="sm"
                  onPress={() => navigation.navigate("AddAddress")}
                />
              </Card>
            ) : (
              <View style={styles.group}>
                {addrList.map((item) => {
                  const active = selectedAddress?.id === item.id;
                  return (
                    <Card
                      key={item.id}
                      variant="outlined"
                      padding="md"
                      onPress={() => setSelectedAddress(item)}
                      style={StyleSheet.flatten([styles.addrCard, active && styles.addrCardActive])}
                    >
                      <View style={[styles.radio, active && styles.radioActive]}>
                        {active ? <Text style={styles.radioCheck}>✓</Text> : null}
                      </View>
                      <View style={styles.addrText}>
                        <Text style={styles.addrLabel}>{item.label}</Text>
                        {item.details ? (
                          <Text style={styles.addrDetails} numberOfLines={1}>{item.details}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.addrPin}>📍</Text>
                    </Card>
                  );
                })}
                <Card variant="flat" padding="sm" onPress={() => navigation.navigate("AddAddress")} style={styles.addAddrRow}>
                  <Text style={styles.addAddrText}>＋ إضافة عنوان جديد</Text>
                </Card>
              </View>
            )}
          </>
        )}

        {/* ===== طريقة الدفع ===== */}
        <SectionHeader title="طريقة الدفع" />
        <Segmented
          value={payment}
          onChange={setPayment}
          options={[
            { value: "cash", label: "💵 نقداً" },
            { value: "card", label: "💳 بطاقة" },
          ]}
        />

        {/* ===== ملخّص الطلب ===== */}
        <SectionHeader title="ملخّص الطلب" />
        <Card variant="soft" padding="md" style={styles.summary}>
          <SummaryRow label="المجموع الفرعي" amount={cart.subtotal()} />
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>رسوم التوصيل</Text>
            <Text style={styles.sumPending}>تُحسب عند التأكيد</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.sumRow}>
            <Text style={styles.totalLabel}>الإجمالي التقديري</Text>
            <PriceTag amount={cart.subtotal()} size="lg" />
          </View>
        </Card>
      </ScrollView>

      {/* ===== شريط التأكيد ===== */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.sm }]}>
        <Button
          label={`أكّد الطلب · ${Math.round(cart.subtotal()).toLocaleString("ar-DZ")} دج`}
          onPress={submit}
          loading={placeOrder.isPending || registering}
          size="lg"
        />
      </View>
    </Screen>
  );
}

function SectionHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <View style={styles.sectionRow}>
      {badge ? (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{badge}</Text>
        </View>
      ) : null}
      <Text style={styles.section}>{title}</Text>
    </View>
  );
}

function SummaryRow({ label, amount }: { label: string; amount: number }) {
  return (
    <View style={styles.sumRow}>
      <Text style={styles.sumLabel}>{label}</Text>
      <PriceTag amount={amount} size="md" muted />
    </View>
  );
}

function CartRow({ line }: { line: CartLine }) {
  const cart = useCart();
  return (
    <Card variant="flat" padding="sm" style={styles.row}>
      <Avatar uri={line.product.image_url} fallback={line.product.name} size={56} shape="rounded" />
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>{line.product.name}</Text>
        <PriceTag amount={Number(line.product.price) * line.qty} size="md" />
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
  scroll: { padding: spacing.lg },

  sectionRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  section: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  sectionBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionBadgeText: { color: "#fff", fontSize: fontSize.caption, fontWeight: fontWeight.bold },

  group: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    padding: spacing.xs,
    gap: spacing.xs,
    ...shadows.sm,
  },
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  rowBody: { flex: 1, gap: spacing.xs },
  rowName: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },

  // العناوين
  addrCard: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md },
  addrCardActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  radioCheck: { color: "#fff", fontSize: 12, fontWeight: fontWeight.bold },
  addrText: { flex: 1 },
  addrLabel: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  addrDetails: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  addrPin: { fontSize: 18 },
  addAddrRow: { alignItems: "center" },
  addAddrText: { color: colors.primary, fontWeight: fontWeight.bold, fontSize: fontSize.body },
  emptyAddr: { gap: spacing.md, alignItems: "center" },
  muted: { color: colors.textMuted, textAlign: "right" },
  guestBox: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.sm,
  },
  phoneInput: { textAlign: "left", writingDirection: "ltr" },

  // الملخّص
  summary: { gap: spacing.md },
  sumRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  sumLabel: { color: colors.textMuted, fontSize: fontSize.body },
  sumPending: { color: colors.textFaint, fontSize: fontSize.small, fontStyle: "italic" },
  divider: { height: 1, backgroundColor: colors.border },
  totalLabel: { color: colors.text, fontSize: fontSize.bodyLg, fontWeight: fontWeight.extrabold },

  footer: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
    paddingTop: spacing.sm,
    backgroundColor: "transparent",
  },
});
