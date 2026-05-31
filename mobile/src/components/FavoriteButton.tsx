/** زرّ القلب للمفضّلة — يبدّل حالة المتجر في المخزن المحلي */
import { Pressable, StyleSheet, Text } from "react-native";

import { useFavorites } from "../store/favorites";
import { colors, radii, shadows } from "../theme/colors";

interface Props {
  merchantId: string;
  size?: number;
  /** خلفية دائرية بيضاء — للوضع فوق صورة */
  floating?: boolean;
}

export function FavoriteButton({ merchantId, size = 22, floating = false }: Props) {
  const isFav = useFavorites((s) => s.ids.includes(merchantId));
  const toggle = useFavorites((s) => s.toggle);

  return (
    <Pressable
      hitSlop={8}
      onPress={() => toggle(merchantId)}
      style={({ pressed }) => [
        floating && styles.floating,
        { width: size + 16, height: size + 16, borderRadius: radii.pill },
        styles.center,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={{ fontSize: size, color: isFav ? colors.danger : colors.textFaint }}>
        {isFav ? "❤️" : "🤍"}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
  floating: {
    backgroundColor: colors.background,
    ...shadows.sm,
  },
});
