import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { merchantsApi } from "../api/merchants";
import type { Product } from "../api/types";
import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useCart } from "../store/cart";
import { colors } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Merchant">;

export function MerchantScreen({ route, navigation }: Props) {
  const { merchantId } = route.params;
  const cart = useCart();

  const query = useQuery({
    queryKey: ["merchant", merchantId],
    queryFn: () => merchantsApi.detail(merchantId),
  });

  if (query.isLoading) {
    return (
      <Screen>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      </Screen>
    );
  }
  if (query.error || !query.data) {
    return (
      <Screen>
        <Text style={styles.error}>تعذّر تحميل التاجر</Text>
      </Screen>
    );
  }

  const m = query.data;

  return (
    <Screen padded={false}>
      <FlatList
        data={m.products.filter((p) => p.available)}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.name}>{m.name}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.meta}>⭐ {Number(m.rating || 0).toFixed(1)}</Text>
              {m.distance_km != null ? <Text style={styles.meta}>📍 {m.distance_km} كم</Text> : null}
              {m.open_hours ? <Text style={styles.meta}>🕐 {m.open_hours}</Text> : null}
            </View>
            {m.description ? <Text style={styles.desc}>{m.description}</Text> : null}
            <Text style={styles.sectionTitle}>القائمة</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>لا توجد منتجات متاحة حالياً</Text>}
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
    <View style={styles.row}>
      {product.image_url ? (
        <Image source={{ uri: product.image_url }} style={styles.thumb} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]} />
      )}
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
        {product.description ? (
          <Text style={styles.productDesc} numberOfLines={2}>{product.description}</Text>
        ) : null}
        <Text style={styles.price}>{Number(product.price).toFixed(0)} دج</Text>
      </View>
      <View style={styles.qtyCol}>
        {lineQty > 0 ? (
          <View style={styles.qtyRow}>
            <Pressable
              style={styles.qtyBtn}
              onPress={() => cart.setQty(product.id, lineQty - 1)}
            >
              <Text style={styles.qtyBtnText}>−</Text>
            </Pressable>
            <Text style={styles.qtyNum}>{lineQty}</Text>
            <Pressable
              style={styles.qtyBtn}
              onPress={() => cart.setQty(product.id, lineQty + 1)}
            >
              <Text style={styles.qtyBtnText}>+</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable style={styles.addBtn} onPress={() => cart.add(product)}>
            <Text style={styles.addBtnText}>{otherMerchant ? "استبدل +" : "إضافة"}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, paddingBottom: 100 },
  header: { gap: 6, marginBottom: 16 },
  name: { fontSize: 24, fontWeight: "800", color: colors.text, textAlign: "right" },
  metaRow: { flexDirection: "row", gap: 14 },
  meta: { fontSize: 14, color: colors.textMuted },
  desc: { fontSize: 14, color: colors.textMuted, textAlign: "right", marginTop: 4 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.text,
    marginTop: 20,
    textAlign: "right",
  },
  row: {
    flexDirection: "row",
    padding: 12,
    gap: 12,
    backgroundColor: colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    alignItems: "center",
  },
  thumb: { width: 64, height: 64, borderRadius: 10, backgroundColor: colors.surface },
  thumbPlaceholder: {},
  productName: { fontSize: 15, fontWeight: "700", color: colors.text, textAlign: "right" },
  productDesc: { fontSize: 12, color: colors.textMuted, textAlign: "right" },
  price: { fontSize: 14, color: colors.primary, fontWeight: "700", textAlign: "right" },
  qtyCol: { alignItems: "center" },
  qtyRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  qtyBtnText: { color: "#fff", fontSize: 18, fontWeight: "700", lineHeight: 20 },
  qtyNum: { fontSize: 15, fontWeight: "700", minWidth: 18, textAlign: "center", color: colors.text },
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  cartBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
  },
  empty: { textAlign: "center", color: colors.textMuted, marginTop: 20 },
  error: { textAlign: "center", color: colors.danger, marginTop: 40 },
});
