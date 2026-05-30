import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { colors, fontWeight, radii, spacing } from "../theme/colors";

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  icon?: string;
  hint?: string;
}

export function Input({ label, error, icon, hint, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.shell,
          focused && styles.shellFocused,
          error ? styles.shellError : null,
        ]}
      >
        {icon ? <Text style={styles.icon}>{icon}</Text> : null}
        <TextInput
          placeholderTextColor={colors.textFaint}
          {...rest}
          style={[styles.input, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
      </View>
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs + 2 },
  label: {
    fontSize: 13,
    color: colors.text,
    fontWeight: fontWeight.semibold,
    textAlign: "right",
    marginBottom: 2,
  },
  shell: {
    minHeight: 52,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  shellFocused: {
    backgroundColor: colors.background,
    borderColor: colors.primary,
  },
  shellError: { borderColor: colors.danger, backgroundColor: colors.dangerSoft },
  icon: { fontSize: 18, color: colors.textMuted },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    textAlign: "right",
    paddingVertical: 12,
  },
  errorText: { color: colors.danger, fontSize: 12, textAlign: "right", marginRight: spacing.xs },
  hint: { color: colors.textMuted, fontSize: 12, textAlign: "right", marginRight: spacing.xs },
});
