import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";

import { colors, fontWeight, radii, spacing } from "../theme/colors";

interface Props {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  align?: "right" | "center";
  style?: ViewStyle;
}

export function Header({ title, subtitle, onBack, right, align = "right", style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      {onBack ? (
        <Pressable onPress={onBack} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]} hitSlop={10}>
          <Text style={styles.iconText}>‹</Text>
        </Pressable>
      ) : (
        <View style={styles.iconBtn} />
      )}

      <View style={[styles.titleWrap, align === "center" && { alignItems: "center" }]}>
        {title ? <Text style={styles.title} numberOfLines={1}>{title}</Text> : null}
        {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
      </View>

      <View style={styles.rightWrap}>{right ?? <View style={styles.iconBtn} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 22, color: colors.text, fontWeight: fontWeight.semibold, lineHeight: 22 },
  titleWrap: { flex: 1, alignItems: "flex-end" },
  title: { fontSize: 17, fontWeight: fontWeight.bold, color: colors.text },
  subtitle: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  rightWrap: { alignItems: "flex-start" },
});
