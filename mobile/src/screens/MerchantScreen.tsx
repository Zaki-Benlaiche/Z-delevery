import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { merchantsApi } from "../api/merchants";
import type { Product } from "../api/types";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { EmptyState } from "../components/EmptyState";
import { PriceTag } from "../components/PriceTag";
import { QuantityStepper } from "../components/QuantityStepper";
import { Skeleton } from "../components/Skeleton";
import { FavoriteButton } from "../components/FavoriteButton";
import { useCart } from "../store/cart";
import { colors, fontSize, fontWeight, radii, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Merchant">;

const ALL = "__all__";

export function MerchantScreen({ route, navigation }: Props) {
  const { merchantId } = route.params;
  const cart = useCart();
  const [activeCat, setActiveCat] = useState<string>(ALL);

  const query = useQuery({
    queryKey: ["merchant", merchantId],
    queryFn: () => merchantsApi.detail(merchantId),
  });

  const products = useMemo(
    () => (query.data?.products ?? []).filter((p) => p.available),
    [query.data],
  );

  // الأقسام المستخرجة من تصنيفات المنتجات
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
      <Screen>
        <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
          <Skeleton width="60%" height={26} />
          <Skeleton width="40%" height={14} />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width="100%" height={88} radius={radii.lg} />
          ))}
        </View>
      </Screen>
    );
  }
  if (query.error || !query.data) {
    return (
      <Screen>
        <EmptyState
          icon="⚠️"
          title="تعذّر تحميل التاجر"
          ctaLabel="إعادة المحاولة"
          onCta={() => query.refetch()}
        />
      </Screen>
    );
  }

  const m = query.data;

  return (
    <Screen padded={false}>
      <FlatList
        data={visibleProducts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm + 2 }} />}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <Avatar uri={m.logo_url} fallback={m.name} size={72} shape="rounded" />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{m.name}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.ratingPill}>
                    <Text style={styles.ratingText}>⭐ {Number(m.rating || 0).toFixed(1)}</Text>
                  </View>
                  {m.distance_km != null ? <Text style={styles.meta}>📍 {m.distance_km} كم</Text> : null}
                  {m.open_hours ? <Text style={styles.meta}>🕐 {m.open_hours}</Text> : null}
                </View>
              </View>
              <FavoriteButton merchantId={m.id} size={22} floating />
            </View>
            {m.description ? <Text style={styles.desc}>{m.description}</Text> : null}

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
                        {c === ALL ? "الكل" : c}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.sectionTitle}>القائمة</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <EmptyState icon="🍽️" title="لا توجد منتجات" hint="لا توجد منتجات متاحة حالياً" />
        }
        renderItem={({ item }) => <ProductRow product={item} />}
      />

      {cart.count() > 0 && cart.merchantId === merchantId ? (
        <View style={styles.cartBar}>
          <Button
            label={`السلّة (${cart.count()}) — ${cart.subtotal().toFixed(0)} دج`}
            onPress={() => navigation.navigate("Cart")}
          />
        </View>
      ) : null}
    </Screen>
  );
}

function ProductRow({ product }: { product: Product }) {
  const cart = useCart();
  const lineQty = cart.lines.find((l) => l.product.id === product.id)?.qty ?? 0;
  const otherMerchant = cart.merchantId && cart.merchantId !== product.merchant_id;

  return (
    <Card variant="outlined" padding="sm" style={styles.row}>
      <Avatar uri={product.image_url} fallback={product.name} size={72} shape="rounded" />
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
        {product.description ? (
          <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>
        ) : null}
        <PriceTag amount={Number(product.price)} size="sm" />
      </View>
      <View style={styles.qtyCol}>
        {lineQty > 0 ? (
          <QuantityStepper
            value={lineQty}
            variant="compact"
            onMinus={() => cart.setQty(product.id, lineQty - 1)}
            onPlus={() => cart.setQty(product.id, lineQty + 1)}
          />
        ) : (
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
            onPress={() => cart.add(product)}
          >
            <Text style={styles.addBtnText}>{otherMerchant ? "استبدل" : "＋"}</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: 100 },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  name: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  metaRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs, alignItems: "center" },
  ratingPill: {
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  ratingText: { fontSize: fontSize.caption + 1, color: colors.text, fontWeight: fontWeight.semibold },
  meta: { fontSize: fontSize.small, color: colors.textMuted },
  desc: { fontSize: fontSize.small, color: colors.textMuted, textAlign: "right", marginTop: spacing.sm },

  chipRow: { gap: spacing.sm, paddingVertical: spacing.lg },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: fontSize.small, color: colors.textMuted, fontWeight: fontWeight.medium },
  chipTextActive: { color: "#fff", fontWeight: fontWeight.bold },

  sectionTitle: {
    fontSize: fontSize.h3,
    fontWeight: fontWeight.bold,
    color: colors.text,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
    textAlign: "right",
  },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  productName: { fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.text, textAlign: "right" },
  productDesc: { fontSize: fontSize.caption + 1, color: colors.textMuted, textAlign: "right" },
  qtyCol: { alignItems: "center" },
  addBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radii.md,
  },
  addBtnText: { color: "#fff", fontWeight: fontWeight.bold, fontSize: fontSize.h4 },
  cartBar: { position: "absolute", left: spacing.lg, right: spacing.lg, bottom: spacing.lg },
});
