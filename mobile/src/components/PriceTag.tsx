import { StyleSheet, Text, View } from "react-native";

import { colors, fontWeight } from "../theme/colors";

interface Props {
  amount: number;
  currency?: string;
  size?: "sm" | "md" | "lg" | "xl";
  muted?: boolean;
}

const SIZES = {
  sm: { num: 13, cur: 11 },
  md: { num: 16, cur: 12 },
  lg: { num: 19, cur: 13 },
  xl: { num: 24, cur: 14 },
};

export function PriceTag({ amount, currency = "دج", size = "md", muted }: Props) {
  const s = SIZES[size];
  const color = muted ? colors.textMuted : colors.text;
  return (
    <View style={styles.wrap}>
      <Text style={[styles.num, { fontSize: s.num, color }]}>{Math.round(amount).toLocaleString("ar-DZ")}</Text>
      <Text style={[styles.cur, { fontSize: s.cur, color: muted ? colors.textFaint : colors.textMuted }]}>{currency}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  num: { fontWeight: fontWeight.extrabold },
  cur: { fontWeight: fontWeight.semibold },
});
