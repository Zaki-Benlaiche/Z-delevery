import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, fontWeight, radii, shadows, spacing } from "../theme/colors";

interface Option<T extends string> {
  value: T;
  label: string;
  icon?: string;
}

interface Props<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.wrap}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.tab, active && styles.tabActive]}
          >
            {opt.icon ? <Text style={[styles.icon, active && styles.iconActive]}>{opt.icon}</Text> : null}
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: 4,
    gap: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    borderRadius: radii.md,
  },
  tabActive: {
    backgroundColor: colors.background,
    ...shadows.sm,
  },
  icon: { fontSize: 15, color: colors.textMuted },
  iconActive: { color: colors.primary },
  label: { fontSize: 13, color: colors.textMuted, fontWeight: fontWeight.semibold },
  labelActive: { color: colors.text, fontWeight: fontWeight.bold },
});
