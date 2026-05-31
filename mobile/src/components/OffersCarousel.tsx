/** كاروسيل العروض الترويجية — يظهر في رئيسية الزبون */
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

import type { Offer } from "../api/types";
import { Skeleton } from "./Skeleton";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";

// ألوان دوّارة لخلفيات بانرات العروض (تنويع بصري عند غياب صورة)
const BANNER_COLORS = ["#FF6B1A", "#0A9396", "#7C3AED", "#E11D48", "#0EA5E9"];

interface Props {
  offers: Offer[];
  loading?: boolean;
  onPressOffer: (offer: Offer) => void;
}

export function OffersCarousel({ offers, loading, onPressOffer }: Props) {
  if (loading) {
    return (
      <View style={styles.loadingRow}>
        {[0, 1].map((i) => (
          <Skeleton key={i} width={280} height={130} radius={radii.xl} />
        ))}
      </View>
    );
  }
  if (offers.length === 0) return null;

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      data={offers}
      keyExtractor={(o) => o.id}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={{ width: spacing.md }} />}
      renderItem={({ item, index }) => (
        <OfferBanner offer={item} color={BANNER_COLORS[index % BANNER_COLORS.length]} onPress={() => onPressOffer(item)} />
      )}
    />
  );
}

function OfferBanner({ offer, color, onPress }: { offer: Offer; color: string; onPress: () => void }) {
  const badge =
    offer.badge_text ?? (offer.discount_pct != null ? `${offer.discount_pct}% خصم` : null);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.banner, { backgroundColor: color }, pressed && { opacity: 0.9 }]}
    >
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <View style={styles.bannerBody}>
        <Text style={styles.bannerTitle} numberOfLines={2}>{offer.title}</Text>
        {offer.subtitle ? (
          <Text style={styles.bannerSubtitle} numberOfLines={1}>{offer.subtitle}</Text>
        ) : null}
        {offer.merchant_name ? (
          <Text style={styles.bannerMerchant} numberOfLines={1}>🏪 {offer.merchant_name}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg },
  loadingRow: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.lg },
  banner: {
    width: 280,
    height: 130,
    borderRadius: radii.xl,
    padding: spacing.lg,
    justifyContent: "flex-end",
    overflow: "hidden",
    ...shadows.md,
  },
  bannerBody: { gap: 2 },
  bannerTitle: { color: "#fff", fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, textAlign: "right" },
  bannerSubtitle: { color: "rgba(255,255,255,0.92)", fontSize: fontSize.small, textAlign: "right" },
  bannerMerchant: { color: "rgba(255,255,255,0.85)", fontSize: fontSize.caption + 1, textAlign: "right", marginTop: spacing.xs },
  badge: {
    position: "absolute",
    top: spacing.md,
    insetInlineStart: spacing.md,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
  },
  badgeText: { color: colors.text, fontSize: fontSize.caption + 1, fontWeight: fontWeight.bold },
});
