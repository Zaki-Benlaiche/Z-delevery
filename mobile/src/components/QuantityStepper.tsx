import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontWeight, radii, shadows } from "../theme/colors";

interface Props {
  value: number;
  onMinus: () => void;
  onPlus: () => void;
  variant?: "compact" | "regular";
  min?: number;
}

export function QuantityStepper({ value, onMinus, onPlus, variant = "regular", min = 0 }: Props) {
  const sizes = variant === "compact" ? COMPACT : REGULAR;
  return (
    <View style={[styles.wrap, { height: sizes.h }]}>
      <Pressable
        onPress={onMinus}
        disabled={value <= min}
        style={({ pressed }) => [
          styles.btn,
          { width: sizes.btn, height: sizes.btn, borderRadius: sizes.btn / 2 },
          pressed && { opacity: 0.85 },
          value <= min && styles.btnDisabled,
        ]}
      >
        <Text style={[styles.btnText, { fontSize: sizes.font }]}>−</Text>
      </Pressable>
      <Text style={[styles.value, { fontSize: sizes.font, minWidth: sizes.btn }]}>{value}</Text>
      <Pressable
        onPress={onPlus}
        style={({ pressed }) => [
          styles.btn,
          { width: sizes.btn, height: sizes.btn, borderRadius: sizes.btn / 2 },
          pressed && { opacity: 0.85 },
        ]}
      >
        <Text style={[styles.btnText, { fontSize: sizes.font }]}>+</Text>
      </Pressable>
    </View>
  );
}

const REGULAR = { h: 40, btn: 32, font: 18 };
const COMPACT = { h: 32, btn: 26, font: 15 };

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: radii.pill,
    paddingHorizontal: 4,
    gap: 2,
    ...shadows.sm,
  },
  btn: {
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { backgroundColor: colors.border },
  btnText: { color: "#FFFFFF", fontWeight: fontWeight.bold, lineHeight: 20 },
  value: { fontWeight: fontWeight.bold, color: colors.text, textAlign: "center" },
});
