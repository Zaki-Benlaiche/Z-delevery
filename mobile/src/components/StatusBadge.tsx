import { StyleSheet, Text, View } from "react-native";

import type { OrderStatus } from "../api/types";
import { useT } from "../i18n";
import { colors, fontWeight, radii, spacing } from "../theme/colors";

// خلفية فاتحة لكل لون لإعطاء مظهر pill بمظهر هادئ
const SOFT_BG: Record<OrderStatus, string> = {
  pending: "#F1F5F9",
  accepted: "#EFF6FF",
  preparing: "#FEF3C7",
  ready: "#F5F3FF",
  picked_up: "#E0F2FE",
  on_the_way: "#ECFEFF",
  delivered: "#ECFDF5",
  cancelled: "#FEF2F2",
};

export function StatusBadge({ status, size = "md" }: { status: OrderStatus; size?: "sm" | "md" }) {
  const { t } = useT();
  const color = colors.status[status];
  const bg = SOFT_BG[status];
  return (
    <View
      style={[
        styles.badge,
        size === "sm" && styles.badgeSm,
        { backgroundColor: bg },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, size === "sm" && styles.textSm, { color }]}>{t(`status.${status}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
  badgeSm: { paddingHorizontal: spacing.sm, paddingVertical: 3 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: fontWeight.semibold },
  textSm: { fontSize: 11 },
});
