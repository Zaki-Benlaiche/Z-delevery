import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";

import { Icon, type IconName } from "./Icon";
import { colors, fontWeight, radii, spacing } from "../theme/colors";

interface Props extends TextInputProps {
  label?: string;
  error?: string | null;
  /** أيقونة إيموجي (قديمة) */
  icon?: string;
  /** أيقونة فيكتور احترافية — لها الأولوية على icon */
  iconName?: IconName;
  hint?: string;
  /** لون التركيز (الحدّ + الأيقونة) — افتراضياً البرتقالي */
  tint?: string;
  /** بادئة ثابتة قبل الحقل (مثل مفتاح الدولة +213) */
  prefix?: string;
}

export function Input({ label, error, icon, iconName, hint, tint = colors.primary, prefix, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.shell,
          focused && styles.shellFocused,
          focused && !error ? { borderColor: tint } : null,
          error ? styles.shellError : null,
        ]}
      >
        {iconName ? (
          <Icon name={iconName} size={18} color={error ? colors.danger : focused ? tint : colors.textMuted} />
        ) : icon ? (
          <Text style={styles.icon}>{icon}</Text>
        ) : null}
        {prefix ? (
          <View style={styles.prefixWrap}>
            <Text style={styles.prefixText}>{prefix}</Text>
            <View style={styles.prefixDivider} />
          </View>
        ) : null}
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
  prefixWrap: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  prefixText: { fontSize: 15, color: colors.text, fontWeight: fontWeight.bold },
  prefixDivider: { width: 1, height: 22, backgroundColor: colors.border },
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
