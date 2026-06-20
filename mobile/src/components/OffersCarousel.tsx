/** كاروسيل العروض الترويجية — يظهر في رئيسية الزبون */
import { useRef, useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View, type ViewToken } from "react-native";

import type { Offer } from "../api/types";
import { cloudinaryThumb } from "../api/upload";
import { Icon } from "./Icon";
import { Skeleton } from "./Skeleton";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";

// تدرّجات تركوازية متناغمة لخلفيات البانرات عند غياب صورة
const PALETTE = ["#0A9396", "#0E7490", "#0F766E", "#155E75", "#115E59"];
const CARD_W = 300;
const GAP = spacing.md;

interface Props {
  offers: Offer[];
  loading?: boolean;
  onPressOffer: (offer: Offer) => void;
}

export function OffersCarousel({ offers, loading, onPressOffer }: Props) {
  const [active, setActive] = useState(0);
  const onViewRef = useRef((info: { viewableItems: ViewToken[] }) => {
    if (info.viewableItems.length > 0) setActive(info.viewableItems[0].index ?? 0);
  });
  const viewConfigRef = useRef({ itemVisiblePercentThreshold: 60 });

  if (loading) {
    return (
      <View style={styles.loadingRow}>
        {[0, 1].map((i) => (
          <Skeleton key={i} width={CARD_W} height={160} radius={radii.xl} />
        ))}
      </View>
    );
  }
  if (offers.length === 0) return null;

  return (
    <View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={offers}
        keyExtractor={(o) => o.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
        snapToInterval={CARD_W + GAP}
        decelerationRate="fast"
        snapToAlignment="start"
        onViewableItemsChanged={onViewRef.current}
        viewabilityConfig={viewConfigRef.current}
        renderItem={({ item, index }) => (
          <OfferBanner offer={item} color={PALETTE[index % PALETTE.length]} onPress={() => onPressOffer(item)} />
        )}
      />
      {offers.length > 1 ? (
        <View style={styles.dots}>
          {offers.map((o, i) => (
            <View key={o.id} style={[styles.dot, i === active && styles.dotActive]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function OfferBanner({ offer, color, onPress }: { offer: Offer; color: string; onPress: () => void }) {
  const badge = offer.badge_text ?? (offer.discount_pct != null ? `${offer.discount_pct}% خصم` : null);
  const img = cloudinaryThumb(offer.image_url, { w: 600 });
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.banner, !img && { backgroundColor: color }, pressed && styles.pressed]}>
      {img ? (
        <>
          <Image source={{ uri: img }} style={styles.bannerImg} resizeMode="cover" />
          <View style={styles.imgOverlay} />
        </>
      ) : (
        <>
          <View style={styles.blob1} />
          <View style={styles.blob2} />
        </>
      )}

      {badge ? (
        <View style={styles.badge}>
          <Icon name="sparkles" size={12} color={colors.accent} />
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}

      <View style={styles.bannerBottom}>
        <View style={{ flex: 1 }}>
          <Text style={styles.bannerTitle} numberOfLines={2}>{offer.title}</Text>
          {offer.subtitle ? <Text style={styles.bannerSubtitle} numberOfLines={1}>{offer.subtitle}</Text> : null}
          {offer.merchant_name ? (
            <View style={styles.merchantRow}>
              <Icon name="store" size={12} color="rgba(255,255,255,0.9)" />
              <Text style={styles.bannerMerchant} numberOfLines={1}>{offer.merchant_name}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.cta}>
          <Icon name="chevronLeft" size={20} color={colors.accent} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: { paddingHorizontal: spacing.lg },
  loadingRow: { flexDirection: "row", gap: spacing.md, paddingHorizontal: spacing.lg },

  banner: {
    width: CARD_W,
    height: 160,
    borderRadius: radii.xl,
    padding: spacing.lg,
    justifyContent: "flex-end",
    overflow: "hidden",
    ...shadows.md,
  },
  pressed: { opacity: 0.96, transform: [{ scale: 0.98 }] },
  bannerImg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" },
  imgOverlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(9,42,46,0.46)" },

  blob1: { position: "absolute", top: -40, insetInlineEnd: -25, width: 130, height: 130, borderRadius: 65, backgroundColor: "rgba(255,255,255,0.12)" },
  blob2: { position: "absolute", bottom: -50, insetInlineStart: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.08)" },

  badge: {
    position: "absolute",
    top: spacing.md,
    insetInlineStart: spacing.md,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    ...shadows.sm,
  },
  badgeText: { color: colors.text, fontSize: fontSize.caption + 1, fontWeight: fontWeight.extrabold },

  bannerBottom: { flexDirection: "row-reverse", alignItems: "flex-end", gap: spacing.sm },
  bannerTitle: { color: "#fff", fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, textAlign: "right" },
  bannerSubtitle: { color: "rgba(255,255,255,0.92)", fontSize: fontSize.small, textAlign: "right", marginTop: 2 },
  merchantRow: { flexDirection: "row-reverse", alignItems: "center", gap: 4, marginTop: spacing.xs },
  bannerMerchant: { color: "rgba(255,255,255,0.85)", fontSize: fontSize.caption + 1, textAlign: "right" },

  cta: {
    width: 40,
    height: 40,
    borderRadius: radii.pill,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },

  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5, marginTop: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.border },
  dotActive: { width: 18, backgroundColor: colors.accent },
});
