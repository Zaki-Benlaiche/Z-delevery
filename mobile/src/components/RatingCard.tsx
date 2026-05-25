/** بطاقة تقييم تظهر للزبون بعد تسليم الطلب — نجوم 1-5 + تعليق اختياري */
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { ratingsApi } from "../api/ratings";
import { Button } from "./Button";
import { colors } from "../theme/colors";

interface Props {
  orderId: string;
}

export function RatingCard({ orderId }: Props) {
  const queryClient = useQueryClient();
  const existing = useQuery({
    queryKey: ["rating", orderId],
    queryFn: () => ratingsApi.get(orderId),
  });

  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");

  const submit = useMutation({
    mutationFn: () => ratingsApi.create(orderId, stars, comment.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rating", orderId] });
      queryClient.invalidateQueries({ queryKey: ["merchants"] });
    },
    onError: (e) => Alert.alert("تعذّر إرسال التقييم", (e as Error).message),
  });

  if (existing.isLoading) return null;

  // تقييم سابق موجود — نعرضه بدل النموذج
  if (existing.data) {
    return (
      <View style={styles.card}>
        <Text style={styles.thanks}>شكراً لتقييمك ✓</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Text key={n} style={[styles.star, { color: n <= existing.data!.stars ? colors.primary : colors.border }]}>
              ★
            </Text>
          ))}
        </View>
        {existing.data.comment ? (
          <Text style={styles.savedComment}>{existing.data.comment}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>كيف كانت تجربتك؟</Text>
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => setStars(n)} hitSlop={8}>
            <Text style={[styles.star, { color: n <= stars ? colors.primary : colors.border }]}>
              ★
            </Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        style={styles.input}
        value={comment}
        onChangeText={setComment}
        placeholder="تعليق (اختياري)"
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={500}
      />
      <Button
        label="إرسال التقييم"
        onPress={() => submit.mutate()}
        loading={submit.isPending}
        disabled={stars === 0}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    padding: 16,
    backgroundColor: "#FFF7F0",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FFE2C8",
    gap: 12,
  },
  title: { fontSize: 16, fontWeight: "700", color: colors.text, textAlign: "right" },
  thanks: { fontSize: 16, fontWeight: "700", color: colors.success, textAlign: "right" },
  starsRow: { flexDirection: "row", gap: 8, justifyContent: "center" },
  star: { fontSize: 36, fontWeight: "700" },
  input: {
    minHeight: 60,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.background,
    color: colors.text,
    textAlign: "right",
    textAlignVertical: "top",
  },
  savedComment: { textAlign: "right", color: colors.textMuted, fontSize: 14 },
});
