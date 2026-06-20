import { useState } from "react";
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { Screen } from "../components/Screen";
import { useT } from "../i18n";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<AppStackParamList, "Feedback">;

const EMOJIS = ["🤔", "😞", "😐", "🙂", "😊", "😍"];

export function FeedbackScreen({ navigation }: Props) {
  const { t } = useT();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);

  const send = () => {
    if (stars === 0) return;
    const subject = encodeURIComponent(`${t("feedback.emailSubject")} — ${stars}/5`);
    const body = encodeURIComponent(`${t(`feedback.rate${stars}`)} (${stars}/5)\n\n${comment.trim()}`);
    Linking.openURL(`mailto:${t("about.email")}?subject=${subject}&body=${body}`).catch(() => {});
    setSent(true);
  };

  if (sent) {
    return (
      <Screen padded={false}>
        <View style={styles.thanksWrap}>
          <View style={styles.thanksCircle}>
            <Icon name="check" size={44} color="#fff" />
          </View>
          <Text style={styles.thanksTitle}>{t("feedback.thanksTitle")}</Text>
          <Text style={styles.thanksMsg}>{t("feedback.thanksMsg")}</Text>
          <Button label={t("feedback.done")} variant="accent" fullWidth={false} style={styles.thanksBtn} onPress={() => navigation.goBack()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <View style={styles.header}>
        <Pressable hitSlop={8} style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("account.feedback")}</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={styles.emoji}>{EMOJIS[stars]}</Text>
          <Text style={styles.prompt}>{t("feedback.prompt")}</Text>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} hitSlop={6} onPress={() => setStars(n)}>
                <Icon name="star" size={40} color={n <= stars ? colors.warning : colors.border} />
              </Pressable>
            ))}
          </View>
          <Text style={[styles.rateLabel, { opacity: stars ? 1 : 0 }]}>
            {stars ? t(`feedback.rate${stars}`) : " "}
          </Text>

          <Text style={styles.commentLabel}>{t("feedback.commentLabel")}</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder={t("feedback.commentPlaceholder")}
            placeholderTextColor={colors.textFaint}
            style={styles.commentInput}
            textAlign="right"
            multiline
            maxLength={500}
          />

          <Button
            label={t("feedback.send")}
            variant="accent"
            size="lg"
            onPress={send}
            disabled={stars === 0}
            style={styles.sendBtn}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  backBtn: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: fontSize.h4, fontWeight: fontWeight.extrabold, color: colors.text },

  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, paddingBottom: spacing.xxl, alignItems: "center" },
  emoji: { fontSize: 56, marginBottom: spacing.md },
  prompt: { fontSize: fontSize.h4, fontWeight: fontWeight.bold, color: colors.text, textAlign: "center", marginBottom: spacing.xl, lineHeight: 26 },

  stars: { flexDirection: "row", gap: spacing.sm },
  rateLabel: { fontSize: fontSize.bodyLg, fontWeight: fontWeight.extrabold, color: colors.warning, marginTop: spacing.md, height: 24 },

  commentLabel: { alignSelf: "stretch", fontSize: fontSize.small, fontWeight: fontWeight.semibold, color: colors.text, textAlign: "right", marginTop: spacing.xl, marginBottom: spacing.sm },
  commentInput: {
    alignSelf: "stretch",
    minHeight: 110,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: spacing.md,
    fontSize: fontSize.body,
    color: colors.text,
    textAlignVertical: "top",
  },
  sendBtn: { alignSelf: "stretch", marginTop: spacing.xl },

  // شكراً
  thanksWrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xl },
  thanksCircle: {
    width: 96,
    height: 96,
    borderRadius: radii.pill,
    backgroundColor: colors.success,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  thanksTitle: { fontSize: fontSize.h2, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "center" },
  thanksMsg: { fontSize: fontSize.body, color: colors.textMuted, textAlign: "center", marginTop: spacing.xs, lineHeight: 22, maxWidth: 300 },
  thanksBtn: { marginTop: spacing.xl, paddingHorizontal: spacing.xxxl },
});
