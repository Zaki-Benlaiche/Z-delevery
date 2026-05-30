import { StyleSheet, Text, View } from "react-native";

import { colors, fontWeight, spacing } from "../theme/colors";
import { Button } from "./Button";

interface Props {
  icon?: string;
  title: string;
  hint?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon = "✨", title, hint, ctaLabel, onCta }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      {ctaLabel && onCta ? (
        <Button label={ctaLabel} onPress={onCta} variant="secondary" fullWidth={false} style={{ marginTop: spacing.lg }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.huge,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  icon: { fontSize: 38 },
  title: { fontSize: 17, fontWeight: fontWeight.bold, color: colors.text, textAlign: "center" },
  hint: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: spacing.xs, lineHeight: 20, maxWidth: 280 },
});
