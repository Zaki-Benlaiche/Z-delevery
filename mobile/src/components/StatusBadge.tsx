import { StyleSheet, Text, View } from "react-native";

import type { OrderStatus } from "../api/types";
import { colors } from "../theme/colors";

const LABELS: Record<OrderStatus, string> = {
  pending: "بانتظار التاجر",
  accepted: "تم القبول",
  preparing: "قيد التحضير",
  ready: "جاهز للاستلام",
  picked_up: "استلمه السائق",
  on_the_way: "في الطريق إليك",
  delivered: "سُلِّم",
  cancelled: "أُلغي",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <View style={[styles.badge, { backgroundColor: colors.status[status] }]}>
      <Text style={styles.text}>{LABELS[status]}</Text>
    </View>
  );
}

export function statusLabel(status: OrderStatus): string {
  return LABELS[status];
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  text: { color: "#fff", fontSize: 12, fontWeight: "600" },
});
