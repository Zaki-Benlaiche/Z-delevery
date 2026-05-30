import { Pressable, StyleSheet, Text } from "react-native";

import { colors, fontWeight, radii, spacing } from "../theme/colors";

interface Props {
  label: string;
  icon?: string;
  selected?: boolean;
  onPress?: () => void;
  variant?: "default" | "filled";
}

export function Chip({ label, icon, selected, onPress, variant = "default" }: Props) {
  const filled = variant === "filled" || selected;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        filled ? styles.chipFilled : styles.chipDefault,
        pressed && { opacity: 0.85 },
      ]}
    >
      {icon ? <Text style={[styles.icon, filled && styles.iconFilled]}>{icon}</Text> : null}
      <Text style={[styles.label, filled && styles.labelFilled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 1,
    borderRadius: radii.pill,
  },
  chipDefault: {
    backgroundColor: colors.surface,
  },
  chipFilled: {
    backgroundColor: colors.primary,
  },
  icon: { fontSize: 14, color: colors.text },
  iconFilled: { color: "#FFFFFF" },
  label: { fontSize: 13, fontWeight: fontWeight.semibold, color: colors.text },
  labelFilled: { color: "#FFFFFF" },
});
