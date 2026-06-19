/** حقل رفع صورة قابل لإعادة الاستخدام — يختار من المعرض، يضغط، يرفع إلى Cloudinary */
import { useState } from "react";
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";

import { uploadToCloudinary, cloudinaryThumb } from "../api/upload";
import { Icon } from "./Icon";
import { colors, fontSize, fontWeight, radii, spacing } from "../theme/colors";

interface Props {
  value: string | null | undefined;
  onChange: (url: string) => void;
  label?: string;
  shape?: "circle" | "rounded";
  size?: number;
  aspect?: [number, number];
  folder?: string;
}

export function ImageUploadField({
  value,
  onChange,
  label = "أضف صورة",
  shape = "rounded",
  size = 96,
  aspect = [1, 1],
  folder = "zdelivry",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const radius = shape === "circle" ? size / 2 : radii.lg;
  const preview = cloudinaryThumb(value, { w: Math.round(size * 2) });

  const pick = async () => {
    if (uploading) return;
    // استيراد ديناميكي: الوحدة الـ native تُحمّل عند الحاجة فقط (لا تتعطّل على بناء قديم بلا الوحدة)
    let ImagePicker: typeof import("expo-image-picker");
    try {
      ImagePicker = await import("expo-image-picker");
    } catch {
      Alert.alert("غير متاح", "ميزة رفع الصور تتطلّب تحديث التطبيق إلى أحدث إصدار.");
      return;
    }
    // الوحدة الـ native قد تكون غائبة عن بناءٍ قديم (الاستيراد ينجح لكنّ الدوالّ undefined)
    if (
      typeof ImagePicker.requestMediaLibraryPermissionsAsync !== "function" ||
      typeof ImagePicker.launchImageLibraryAsync !== "function"
    ) {
      Alert.alert("تتطلّب تحديثاً", "ميزة رفع الصور تحتاج نسخة أحدث من التطبيق (بناء جديد). سنفعّلها في التحديث القادم.");
      return;
    }

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("الإذن مطلوب", "اسمح بالوصول إلى الصور لرفع صورة.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect,
        quality: 0.6,
      });
      if (result.canceled) return;

      setUploading(true);
      const url = await uploadToCloudinary(result.assets[0].uri, folder);
      onChange(url);
    } catch (e) {
      Alert.alert("تعذّر الرفع", (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={pick}
        style={({ pressed }) => [
          styles.box,
          { width: size, height: size, borderRadius: radius },
          pressed && { opacity: 0.85 },
        ]}
      >
        {preview ? (
          <Image source={{ uri: preview }} style={[styles.img, { borderRadius: radius }]} resizeMode="cover" />
        ) : (
          <View style={styles.placeholder}>
            <Icon name="camera" size={22} color={colors.textMuted} />
          </View>
        )}

        {uploading ? (
          <View style={[styles.overlay, { borderRadius: radius }]}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : (
          <View style={styles.editBadge}>
            <Icon name={value ? "edit" : "plus"} size={13} color="#fff" />
          </View>
        )}
      </Pressable>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: spacing.xs },
  box: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  img: { width: "100%", height: "100%" },
  placeholder: { alignItems: "center", justifyContent: "center" },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  editBadge: {
    position: "absolute",
    bottom: 4,
    insetInlineEnd: 4,
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  label: { fontSize: fontSize.caption, color: colors.textMuted, fontWeight: fontWeight.semibold },
});
