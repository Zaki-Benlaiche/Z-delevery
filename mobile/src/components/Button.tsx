import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from "react-native";

import { colors, fontWeight, radii, shadows, spacing } from "../theme/colors";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

interface Props extends Omit<PressableProps, "style" | "children"> {
  label: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  variant = "primary",
  size = "md",
  loading,
  icon,
  fullWidth = true,
  style,
  disabled,
  ...rest
}: Props) {
  const v = variantStyles[variant];
  const s = sizeStyles[size];
  const isPrimary = variant === "primary" || variant === "danger" || variant === "accent";

  return (
    <Pressable
      {...rest}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        s.base,
        v.container,
        variant === "primary" && shadows.primary,
        variant === "accent" && shadows.accent,
        !fullWidth && styles.shrink,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? "#fff" : colors.primary} />
      ) : (
        <View style={styles.content}>
          {icon ? <Text style={[s.icon, { color: v.text.color }]}>{icon}</Text> : null}
          <Text style={[styles.label, s.label, v.text]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  shrink: { alignSelf: "flex-start" },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  label: { fontWeight: fontWeight.bold, letterSpacing: 0.2 },
});

const sizeStyles = {
  sm: StyleSheet.create({
    base: { height: 38, paddingHorizontal: spacing.lg },
    label: { fontSize: 13 },
    icon: { fontSize: 14 },
  }),
  md: StyleSheet.create({
    base: { height: 50, paddingHorizontal: spacing.xl },
    label: { fontSize: 15 },
    icon: { fontSize: 16 },
  }),
  lg: StyleSheet.create({
    base: { height: 56, paddingHorizontal: spacing.xxl },
    label: { fontSize: 16 },
    icon: { fontSize: 18 },
  }),
};

const variantStyles = {
  primary: StyleSheet.create({
    container: { backgroundColor: colors.primary },
    text: { color: "#FFFFFF" },
  }),
  secondary: StyleSheet.create({
    container: {
      backgroundColor: colors.background,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    text: { color: colors.text },
  }),
  ghost: StyleSheet.create({
    container: { backgroundColor: "transparent" },
    text: { color: colors.textMuted },
  }),
  danger: StyleSheet.create({
    container: { backgroundColor: colors.danger },
    text: { color: "#FFFFFF" },
  }),
  accent: StyleSheet.create({
    container: { backgroundColor: colors.accent },
    text: { color: "#FFFFFF" },
  }),
};
