import { Image, StyleSheet, Text, View } from "react-native";

import { cloudinaryThumb } from "../api/upload";
import { colors, fontWeight, radii } from "../theme/colors";

interface Props {
  uri?: string | null;
  fallback?: string;
  size?: number;
  shape?: "circle" | "square" | "rounded";
}

export function Avatar({ uri, fallback = "?", size = 56, shape = "rounded" }: Props) {
  const radius = shape === "circle" ? size / 2 : shape === "square" ? 0 : radii.md;
  const src = cloudinaryThumb(uri, { w: Math.round(size * 2) });
  return (
    <View
      style={[styles.wrap, { width: size, height: size, borderRadius: radius }]}
    >
      {src ? (
        <Image source={{ uri: src }} style={[styles.img, { borderRadius: radius }]} />
      ) : (
        <Text style={[styles.text, { fontSize: size * 0.4 }]}>{fallback.charAt(0).toUpperCase()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.primarySoft,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  img: { width: "100%", height: "100%" },
  text: { fontWeight: fontWeight.extrabold, color: colors.primary },
});
