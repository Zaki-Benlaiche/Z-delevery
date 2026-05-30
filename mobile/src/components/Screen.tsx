import type { ReactNode } from "react";
import { StatusBar, StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, spacing } from "../theme/colors";

interface Props {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
  background?: "canvas" | "white";
  barStyle?: "dark-content" | "light-content";
}

export function Screen({
  children,
  style,
  padded = true,
  background = "canvas",
  barStyle = "dark-content",
}: Props) {
  const insets = useSafeAreaInsets();
  const bg = background === "white" ? colors.background : colors.canvas;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg, paddingTop: insets.top }]} edges={["top"]}>
      <StatusBar barStyle={barStyle} backgroundColor={bg} />
      <View style={[styles.inner, padded && styles.padded, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  inner: { flex: 1 },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.xs },
});
