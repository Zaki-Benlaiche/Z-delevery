import type { ReactNode } from "react";
import { Pressable, StyleSheet, View, type PressableProps, type ViewStyle } from "react-native";

import { colors, radii, shadows, spacing } from "../theme/colors";

interface Props extends Omit<PressableProps, "style" | "children"> {
  children: ReactNode;
  onPress?: () => void;
  variant?: "elevated" | "outlined" | "flat" | "soft";
  padding?: keyof typeof PADDINGS;
  style?: ViewStyle;
}

const PADDINGS = {
  none: 0,
  sm: spacing.md,
  md: spacing.lg,
  lg: spacing.xl,
};

export function Card({ children, onPress, variant = "elevated", padding = "md", style, ...rest }: Props) {
  const v = variantStyles[variant];
  const padStyle = { padding: PADDINGS[padding] };
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        {...rest}
        style={({ pressed }) => [styles.base, v, padStyle, pressed && styles.pressed, style]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.base, v, padStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  base: { borderRadius: radii.lg, backgroundColor: colors.background },
  pressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },
});

const variantStyles = {
  elevated: { ...shadows.sm, backgroundColor: colors.background },
  outlined: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background },
  flat: { backgroundColor: colors.background },
  soft: { backgroundColor: colors.surface },
};
