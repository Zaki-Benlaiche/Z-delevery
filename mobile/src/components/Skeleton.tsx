import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type DimensionValue, type ViewStyle } from "react-native";

import { colors, radii } from "../theme/colors";

interface SkelProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 14, radius = radii.sm, style }: SkelProps) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.surface, opacity },
        style as ViewStyle,
      ]}
    />
  );
}

/** هيكل بطاقة متجر — مطابق لشكل MerchantCard */
export function MerchantCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width="100%" height={140} radius={16} />
      <View style={{ padding: 12, gap: 8 }}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="50%" height={12} />
        <Skeleton width="30%" height={12} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, backgroundColor: colors.background, overflow: "hidden" },
});
