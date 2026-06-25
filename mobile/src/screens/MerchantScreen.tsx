import { useMemo, useState } from "react";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { merchantsApi } from "../api/merchants";
import { cloudinaryThumb } from "../api/upload";
import type { MerchantType, Product } from "../api/types";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import { PriceTag } from "../components/PriceTag";
import { QuantityStepper } from "../components/QuantityStepper";
import { Skeleton } from "../components/Skeleton";
import { FavoriteButton } from "../components/FavoriteButton";
import { Icon } from "../components/Icon";
import { useT } from "../i18n";
import { useCart } from "../store/cart";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Merchant">;

const ALL = "__all__";

const TYPE_META: Record<MerchantType, { labelKey: string; emoji: string; tint: string }> = {
  food: { labelKey: "type.food", emoji: "🍔", tint: "#FEF3C7" },
  fresh: { labelKey: "type.fresh", emoji: "🥬", tint: "#ECFDF5" },
  market: { labelKey: "type.market", emoji: "🛒", tint: "#EFF6FF" },
  clinic: { labelKey: "type.clinic", emoji: "🩺", tint: "#E6F4F4" },
};

function etaText(km: number | null): string {
  const mins = km == null ? 25 : Math.round(12 + km * 5);
  const lo = Math.min(55, Math.max(10, Math.round(mins / 5) * 5));
  return `${lo}–${lo + 10}`;
}

export function MerchantScreen({ route, navigation }: Props) {
  const { merchantId } = route.params;
  const { t } = useT();
  const cart = useCart();
  const insets = useSafeAreaInsets();
  const [activeCat, setActiveCat] = useState<string>(ALL);

  const query = useQuery({
    queryKey: ["merchant", merchantId],
    queryFn: () => merchantsApi.detail(merchantId),
  });

  const products = useMemo(
    () => (query.data?.products ?? []).filter((p) => p.available),
    [query.data],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [products]);

  const visibleProducts = useMemo(
    () => (activeCat === ALL ? products : products.filter((p) => p.category === activeCat)),
    [products, activeCat],
  );

  if (query.isLoading) {
    return (
      <Screen padded background="white">
        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          <Skeleton width="100%" height={180} radius={radii.xl} />
          <Skeleton width="60%" height={26} />
          <Skeleton width="40%" height={14} />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={92} radius={radii.lg} />
          ))}
        </View>
      </Screen>
    );
  }
  if (query.error || !query.data) {
    return (
      <Screen padded background="white">
        <EmptyState
          icon="⚠️"
          title={t("merchant.loadError")}
          ctaLabel={t("common.retry")}
          onCta={() => query.refetch()}
        />
      </Screen>
    );
  }

  const m = query.data;
  const meta = TYPE_META[m.type];

  const cartActive = cart.count() > 0 && cart.merchantId === merchantId;

  const header = (
    <View>
      {/* ===== الواجهة (Hero) ===== */}
      <View style={[styles.cover, { backgroundColor: meta.tint }]}>
        {m.logo_url ? (
          <Image source={{ uri: cloudinaryThumb(m.logo_url, { w: 1080 })! }} style={styles.coverImg} resizeMode="cover" />
        ) : (
          <Text style={styles.coverEmoji}>{meta.emoji}</Text>
        )}
        <View style={styles.coverScrim} />

        {/* أزرار علوية */}
        <View style={[styles.topBar, { top: insets.top + spacing.sm }]}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.circleBtn, pressed && styles.pressed]}
          >
            <Icon name="back" size={22} color={colors.text} />
          </Pressable>
          <View style={styles.circleBtn}>
            <FavoriteButton merchantId={m.id} size={20} />
          </View>
        </View>

        {!m.is_open ? (
          <View style={styles.closedPill}>
            <Text style={styles.closedPillText}>{t("merchant.closedNow")}</Text>
          </View>
        ) : null}
      </View>

      {/* ===== الورقة البيضاء (تتداخل مع الغلاف) ===== */}
      <View style={styles.sheet}>
        <Text style={styles.name}>{m.name}</Text>
        <Text style={styles.type}>{t(meta.labelKey)}</Text>

        <View style={styles.statRow}>
          <View style={[styles.statPill, styles.ratingPill]}>
            <Icon name="star" size={13} color={colors.success} />
            <Text style={styles.ratingPillText}>{Number(m.rating || 0).toFixed(1)}</Text>
          </View>
          <View style={styles.statPill}>
            <Icon name="scooter" size={14} color={colors.text} />
            <Text style={styles.statPillText}>{etaText(m.distance_km)} {t("common.min")}</Text>
          </View>
          {m.distance_km != null ? (
            <View style={styles.statPill}>
              <Icon name="location" size={13} color={colors.text} />
              <Text style={styles.statPillText}>{m.distance_km} {t("common.km")}</Text>
            </View>
          ) : null}
        </View>

        {m.description ? <Text style={styles.desc}>{m.description}</Text> : null}
        {m.open_hours ? (
          <View style={styles.hoursRow}>
            <Icon name="clock" size={14} color={colors.textMuted} />
            <Text style={styles.hoursText}>{t("merchant.workHours")}: {m.open_hours}</Text>
          </View>
        ) : null}
      </View>

      {/* ===== أقسام المنتجات ===== */}
      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {[ALL, ...categories].map((c) => {
            const active = activeCat === c;
            return (
              <Pressable
                key={c}
                onPress={() => setActiveCat(c)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {c === ALL ? t("common.all") : c}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.sectionTitle}>{t("merchant.menu")}</Text>
      )}
    </View>
  );

  return (
    <Screen padded={false} background="white" barStyle="light-content">
      <FlatList
        data={visibleProducts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={[styles.list, cartActive && { paddingBottom: 110 }]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        ListHeaderComponent={header}
        ListEmptyComponent={
          <EmptyState icon="🍽️" title={t("merchant.noProducts")} hint={t("merchant.noProductsHint")} />
        }
        renderItem={({ item }) => <ProductRow product={item} />}
      />

      {cartActive ? (
        <View style={[styles.cartBarWrap, { paddingBottom: insets.bottom + spacing.sm }]}>
          <Pressable
            onPress={() => navigation.navigate("Cart")}
            style={({ pressed }) => [styles.cartBar, pressed && styles.pressed]}
          >
            <View style={styles.cartCount}>
              <Text style={styles.cartCountText}>{cart.count()}</Text>
            </View>
            <Text style={styles.cartBarLabel}>{t("merchant.viewCart")}</Text>
            <View style={styles.cartTotal}>
              <PriceTag amount={cart.subtotal()} size="md" />
            </View>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

function ProductRow({ product }: { product: Product }) {
  const { t } = useT();
  const cart = useCart();
  const lineQty = cart.lines.find((l) => l.product.id === product.id)?.qty ?? 0;
  const otherMerchant = cart.merchantId && cart.merchantId !== product.merchant_id;
  const active = lineQty > 0;

  return (
    <Card variant={active ? "elevated" : "outlined"} padding="sm" style={styles.row}>
      <Avatar uri={product.image_url} fallback={product.name} size={76} shape="rounded" />
      <View style={styles.rowBody}>
        <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
        {product.description ? (
          <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>
        ) : null}
        <View style={styles.priceRow}>
          <PriceTag amount={Number(product.price)} size="md" />
        </View>
      </View>
      <View style={styles.qtyCol}>
        {active ? (
          <QuantityStepper
            value={lineQty}
            variant="compact"
            onMinus={() => cart.setQty(product.id, lineQty - 1)}
            onPlus={() => cart.setQty(product.id, lineQty + 1)}
          />
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.addBtn,
              otherMerchant && styles.addBtnWide,
              pressed && styles.pressed,
            ]}
            onPress={() => cart.add(product)}
          >
            {otherMerchant ? (
              <Text style={styles.addBtnText}>{t("merchant.replace")}</Text>
            ) : (
              <Icon name="plus" size={22} color="#fff" />
            )}
          </Pressable>
        )}
      </View>
    </Card>
  );
}

const COVER_H = 200;

const styles = StyleSheet.create({
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },

  // الواجهة
  cover: {
    height: COVER_H,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  coverImg: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, width: "100%", height: "100%" },
  coverEmoji: { fontSize: 72 },
  coverScrim: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(15,23,42,0.38)",
  },
  topBar: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.95)",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
  backIcon: { fontSize: 22, color: colors.text, fontWeight: fontWeight.bold },
  closedPill: {
    position: "absolute",
    bottom: spacing.xl,
    right: spacing.lg,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  closedPillText: { color: "#fff", fontSize: fontSize.caption, fontWeight: fontWeight.bold },

  // الورقة البيضاء
  sheet: {
    backgroundColor: colors.background,
    marginTop: -spacing.xl,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.sm,
  },
  name: { fontSize: fontSize.h1, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  type: { fontSize: fontSize.body, color: colors.textMuted, textAlign: "right", marginTop: -spacing.xs },
  statRow: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.xs },
  statPill: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 1,
    borderRadius: radii.pill,
  },
  statPillText: { fontSize: fontSize.small, color: colors.text, fontWeight: fontWeight.semibold },
  ratingPill: { backgroundColor: colors.successSoft },
  ratingPillText: { fontSize: fontSize.small, color: colors.success, fontWeight: fontWeight.bold },

  desc: {
    fontSize: fontSize.body,
    color: colors.textMuted,
    textAlign: "right",
    marginTop: spacing.xs,
    lineHeight: 22,
  },
  hoursRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  hoursText: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right" },

  chipRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.lg },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 1,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, ...shadows.primary },
  chipText: { fontSize: fontSize.small, color: colors.textMuted, fontWeight: fontWeight.semibold },
  chipTextActive: { color: "#fff", fontWeight: fontWeight.bold },

  sectionTitle: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.extrabold,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    textAlign: "right",
  },

  // القائمة + المنتجات
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxxl },
  row: { flexDirection: "row-reverse", gap: spacing.md, alignItems: "center" },
  rowBody: { flex: 1, gap: spacing.xs },
  productName: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  productDesc: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", lineHeight: 18 },
  priceRow: { flexDirection: "row-reverse", marginTop: 2 },
  qtyCol: { alignItems: "center", justifyContent: "center" },
  addBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    ...shadows.primary,
  },
  addBtnWide: { width: "auto", paddingHorizontal: spacing.md },
  addBtnText: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.small },

  // شريط السلّة
  cartBarWrap: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    bottom: 0,
    paddingTop: spacing.sm,
  },
  cartBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    height: 58,
    gap: spacing.md,
    ...shadows.primary,
  },
  cartCount: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  cartCountText: { color: "#fff", fontWeight: fontWeight.extrabold, fontSize: fontSize.body },
  cartBarLabel: { flex: 1, color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.bodyLg, textAlign: "center" },
  cartTotal: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radii.md,
  },
});
