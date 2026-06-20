import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { addressesApi } from "../api/addresses";
import { ordersApi } from "../api/orders";
import type { Address, OrderCreatePayload, PaymentMethod } from "../api/types";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { Avatar } from "../components/Avatar";
import { Icon, type IconName } from "../components/Icon";
import { Input } from "../components/Input";
import { PriceTag } from "../components/PriceTag";
import { QuantityStepper } from "../components/QuantityStepper";
import { useAuth } from "../auth/context";
import { useCurrentLocation } from "../hooks/useLocation";
import { useCart, type CartLine } from "../store/cart";
import { useT } from "../i18n";
import { isValidDzPhone, normalizeDzPhone } from "../utils/phone";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Cart">;

export function CartScreen({ navigation }: Props) {
  const cart = useCart();
  const { t } = useT();
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
    onError: (e) => Alert.alert(t("cart.orderError"), (e as Error).message),
  });

  if (cart.lines.length === 0) {
    return (
      <Screen padded={false} background="white">
        <CartHeader title={t("cart.title")} onBack={() => navigation.goBack()} />
        <View style={styles.empty}>
          <View style={styles.emptyIconOuter}>
            <View style={styles.emptyIconInner}>
              <Icon name="bag" size={34} color={colors.accent} />
            </View>
          </View>
          <Text style={styles.emptyTitle}>{t("cart.empty")}</Text>
          <Text style={styles.emptyHint}>{t("cart.emptyHint")}</Text>
          <Button label={t("cart.browse")} variant="accent" fullWidth={false} style={styles.emptyCta} onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  const items = () =>
    cart.lines.map((l) => ({ product_id: l.product.id, qty: l.qty, options: l.options }));

  const submit = async () => {
    if (!cart.merchantId) return;

    if (isGuest) {
      if (!isValidDzPhone(guestPhone)) {
        Alert.alert(t("cart.needPhoneTitle"), t("cart.needPhoneMsg"));
        return;
      }
      if (!guestAddress.trim()) {
        Alert.alert(t("cart.needAddressTitle"), t("cart.needAddressMsg"));
        return;
      }
      try {
        setRegistering(true);
        await quickSignIn(normalizeDzPhone(guestPhone), guestName.trim() || undefined);
      } catch (e) {
        setRegistering(false);
        Alert.alert(t("cart.checkoutError"), (e as Error).message);
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
      Alert.alert(t("cart.selectAddressTitle"), t("cart.selectAddressMsg"));
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
  const cur = t("common.currency");

  return (
    <Screen padded={false} background="canvas">
      <CartHeader title={t("cart.title")} onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 130 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ===== المنتجات ===== */}
        <SectionHeader title={t("cart.yourItems")} badge={`${cart.count()}`} />
        <View style={styles.group}>
          {cart.lines.map((line) => (
            <CartRow key={line.product.id} line={line} cur={cur} t={t} />
          ))}
        </View>

        {isGuest ? (
          <>
            {/* ===== بيانات الضيف ===== */}
            <SectionHeader title={t("cart.yourInfo")} />
            <View style={styles.guestBox}>
              <Input
                label={t("cart.phone")}
                value={guestPhone}
                onChangeText={(v) => setGuestPhone(v.replace(/[^\d]/g, ""))}
                keyboardType="phone-pad"
                placeholder="555 12 34 56"
                iconName="phone"
                prefix="+213"
                tint={colors.accent}
                style={styles.phoneInput}
                maxLength={12}
              />
              <Input
                label={t("cart.nameOptional")}
                value={guestName}
                onChangeText={setGuestName}
                placeholder={t("account.nameExample")}
                iconName="person"
                tint={colors.accent}
              />
            </View>

            {/* ===== عنوان التسليم ===== */}
            <SectionHeader title={t("cart.deliveryAddress")} />
            <View style={styles.guestBox}>
              <Input
                value={guestAddress}
                onChangeText={setGuestAddress}
                placeholder={t("cart.addressExample")}
                iconName="location"
                tint={colors.accent}
                multiline
                hint={t("cart.addressHint")}
              />
            </View>
          </>
        ) : (
          <>
            {/* ===== عنوان التسليم ===== */}
            <SectionHeader title={t("cart.deliveryAddress")} />
            {addresses.isLoading ? (
              <Text style={styles.muted}>{t("common.loading")}</Text>
            ) : addrList.length === 0 ? (
              <View style={styles.emptyAddr}>
                <Icon name="location" size={20} color={colors.textMuted} />
                <Text style={styles.muted}>{t("cart.noAddresses")}</Text>
                <Button label={t("cart.addAddress")} variant="accent" size="sm" fullWidth={false} onPress={() => navigation.navigate("AddAddress")} />
              </View>
            ) : (
              <View style={styles.group}>
                {addrList.map((item) => {
                  const active = selectedAddress?.id === item.id;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => setSelectedAddress(item)}
                      style={[styles.addrCard, active && styles.addrCardActive]}
                    >
                      <View style={[styles.radio, active && styles.radioActive]}>
                        {active ? <Icon name="check" size={12} color="#fff" /> : null}
                      </View>
                      <View style={styles.addrText}>
                        <Text style={styles.addrLabel}>{item.label}</Text>
                        {item.details ? (
                          <Text style={styles.addrDetails} numberOfLines={1}>{item.details}</Text>
                        ) : null}
                      </View>
                      <View style={[styles.addrPin, active && styles.addrPinActive]}>
                        <Icon name="locationFill" size={16} color={active ? colors.accent : colors.textMuted} />
                      </View>
                    </Pressable>
                  );
                })}
                <Pressable onPress={() => navigation.navigate("AddAddress")} style={styles.addAddrRow}>
                  <Icon name="plus" size={16} color={colors.accent} />
                  <Text style={styles.addAddrText}>{t("cart.addAddress")}</Text>
                </Pressable>
              </View>
            )}
          </>
        )}

        {/* ===== طريقة الدفع ===== */}
        <SectionHeader title={t("cart.payment")} />
        <View style={styles.payRow}>
          <PayCard icon="cash" label={t("cart.cash")} active={payment === "cash"} onPress={() => setPayment("cash")} />
          <PayCard icon="card" label={t("cart.card")} active={payment === "card"} onPress={() => setPayment("card")} />
        </View>

        {/* ===== ملخّص الطلب ===== */}
        <SectionHeader title={t("cart.summary")} />
        <View style={styles.summary}>
          <SummaryRow label={t("cart.subtotal")} amount={cart.subtotal()} cur={cur} />
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>{t("cart.deliveryFee")}</Text>
            <Text style={styles.sumPending}>{t("cart.computedLater")}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.sumRow}>
            <Text style={styles.totalLabel}>{t("cart.estimatedTotal")}</Text>
            <PriceTag amount={cart.subtotal()} size="lg" currency={cur} />
          </View>
        </View>
      </ScrollView>

      {/* ===== شريط التأكيد ===== */}
      <View style={[styles.footer, { paddingBottom: (insets.bottom || spacing.sm) + spacing.sm }]}>
        <View style={styles.footerRow}>
          <Text style={styles.footerCount}>{t("orders.itemCount").replace("{n}", String(cart.count()))}</Text>
          <PriceTag amount={cart.subtotal()} size="lg" currency={cur} />
        </View>
        <Button
          label={t("cart.confirm")}
          variant="accent"
          onPress={submit}
          loading={placeOrder.isPending || registering}
          size="lg"
        />
      </View>
    </Screen>
  );
}

function CartHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable hitSlop={8} style={styles.backBtn} onPress={onBack}>
        <Icon name="back" size={22} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.backBtn} />
    </View>
  );
}

function SectionHeader({ title, badge }: { title: string; badge?: string }) {
  return (
    <View style={styles.sectionRow}>
      <View style={styles.sectionBar} />
      <Text style={styles.section}>{title}</Text>
      {badge ? (
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

function SummaryRow({ label, amount, cur }: { label: string; amount: number; cur: string }) {
  return (
    <View style={styles.sumRow}>
      <Text style={styles.sumLabel}>{label}</Text>
      <PriceTag amount={amount} size="md" currency={cur} muted />
    </View>
  );
}

function PayCard({ icon, label, active, onPress }: { icon: IconName; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.payCard, active && styles.payCardActive]} onPress={onPress}>
      <Icon name={icon} size={20} color={active ? colors.accent : colors.textMuted} />
      <Text style={[styles.payLabel, active && styles.payLabelActive]}>{label}</Text>
      {active ? (
        <View style={styles.payCheck}>
          <Icon name="check" size={10} color="#fff" />
        </View>
      ) : null}
    </Pressable>
  );
}

function CartRow({ line, cur, t }: { line: CartLine; cur: string; t: (k: string) => string }) {
  const cart = useCart();
  return (
    <View style={styles.row}>
      <Avatar uri={line.product.image_url} fallback={line.product.name} size={56} shape="rounded" />
      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <Text style={styles.rowName} numberOfLines={1}>{line.product.name}</Text>
          <Pressable hitSlop={8} onPress={() => cart.remove(line.product.id)}>
            <Icon name="trash" size={16} color={colors.textFaint} />
          </Pressable>
        </View>
        <Text style={styles.rowUnit}>{Math.round(Number(line.product.price)).toLocaleString("ar-DZ")} {cur} · {t("cart.each")}</Text>
        <View style={styles.rowBottom}>
          <QuantityStepper
            value={line.qty}
            variant="compact"
            min={1}
            onMinus={() => cart.setQty(line.product.id, line.qty - 1)}
            onPlus={() => cart.setQty(line.product.id, line.qty + 1)}
          />
          <PriceTag amount={Number(line.product.price) * line.qty} size="md" currency={cur} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text },

  scroll: { padding: spacing.lg, paddingTop: spacing.xs },

  // فارغة
  empty: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl, paddingBottom: spacing.huge },
  emptyIconOuter: { width: 112, height: 112, borderRadius: radii.pill, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: spacing.lg },
  emptyIconInner: { width: 72, height: 72, borderRadius: radii.pill, backgroundColor: colors.background, alignItems: "center", justifyContent: "center", ...shadows.sm },
  emptyTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "center" },
  emptyHint: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "center", marginTop: spacing.xs, lineHeight: 20, maxWidth: 280 },
  emptyCta: { marginTop: spacing.xl, paddingHorizontal: spacing.xxl },

  sectionRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, marginTop: spacing.xl, marginBottom: spacing.md },
  sectionBar: { width: 4, height: 18, borderRadius: radii.pill, backgroundColor: colors.accent },
  section: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  sectionBadge: { minWidth: 22, height: 22, paddingHorizontal: 6, borderRadius: radii.pill, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },
  sectionBadgeText: { color: "#fff", fontSize: fontSize.caption, fontWeight: fontWeight.bold },

  group: {
    backgroundColor: colors.background,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    padding: spacing.sm,
    gap: spacing.sm,
    ...shadows.sm,
  },

  // صفّ المنتج
  row: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, padding: spacing.sm },
  rowBody: { flex: 1, gap: spacing.xs },
  rowTop: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm },
  rowName: { flex: 1, fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  rowUnit: { fontSize: fontSize.caption + 1, color: colors.textMuted, textAlign: "right" },
  rowBottom: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", marginTop: 2 },

  // العناوين
  addrCard: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radii.lg, borderWidth: 1.5, borderColor: "transparent", backgroundColor: colors.surface },
  addrCardActive: { borderColor: colors.accent, backgroundColor: colors.primarySoft },
  radio: { width: 22, height: 22, borderRadius: radii.pill, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  radioActive: { borderColor: colors.accent, backgroundColor: colors.accent },
  addrText: { flex: 1 },
  addrLabel: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  addrDetails: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: 2 },
  addrPin: { width: 32, height: 32, borderRadius: radii.pill, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" },
  addrPinActive: { backgroundColor: "#fff" },
  addAddrRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xs, paddingVertical: spacing.md },
  addAddrText: { color: colors.accent, fontWeight: fontWeight.bold, fontSize: fontSize.body },
  emptyAddr: { backgroundColor: colors.background, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, padding: spacing.lg, gap: spacing.md, alignItems: "center", ...shadows.sm },
  muted: { color: colors.textMuted, textAlign: "center" },
  guestBox: { backgroundColor: colors.background, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, padding: spacing.lg, gap: spacing.md, ...shadows.sm },
  phoneInput: { textAlign: "left", writingDirection: "ltr" },

  // الدفع
  payRow: { flexDirection: "row-reverse", gap: spacing.sm },
  payCard: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.background,
    borderWidth: 1.5,
    borderColor: colors.borderSoft,
    ...shadows.sm,
  },
  payCardActive: { borderColor: colors.accent, backgroundColor: colors.primarySoft },
  payLabel: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.textMuted },
  payLabelActive: { color: colors.accent },
  payCheck: { width: 18, height: 18, borderRadius: radii.pill, backgroundColor: colors.accent, alignItems: "center", justifyContent: "center" },

  // الملخّص
  summary: { backgroundColor: colors.background, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.borderSoft, padding: spacing.lg, gap: spacing.md, ...shadows.sm },
  sumRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  sumLabel: { color: colors.textMuted, fontSize: fontSize.body },
  sumPending: { color: colors.textFaint, fontSize: fontSize.small, fontStyle: "italic" },
  divider: { height: 1, backgroundColor: colors.divider },
  totalLabel: { color: colors.text, fontSize: fontSize.bodyLg, fontWeight: fontWeight.extrabold },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    gap: spacing.sm,
    ...shadows.lg,
  },
  footerRow: { flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center" },
  footerCount: { fontSize: fontSize.small, color: colors.textMuted, fontWeight: fontWeight.semibold },
});
