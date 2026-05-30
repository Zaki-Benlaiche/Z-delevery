import { StyleSheet, Text, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { Card } from "../components/Card";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../auth/context";
import { colors, fontSize, fontWeight, spacing } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "AccountTab">,
  NativeStackScreenProps<AppStackParamList>
>;

const ROLE_LABEL: Record<string, string> = {
  customer: "زبون",
  driver: "سائق",
  merchant: "تاجر",
};

export function AccountScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const roleLabel = user?.role ? ROLE_LABEL[user.role] ?? user.role : "—";

  return (
    <Screen>
      <Card variant="soft" padding="md" style={styles.profile}>
        <Avatar fallback={roleLabel} size={56} shape="circle" />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{roleLabel}</Text>
          <Text style={styles.muted}>المعرّف: {user?.user_id.slice(0, 8) ?? "—"}</Text>
        </View>
      </Card>

      <View style={styles.section}>
        <Button
          label="عناويني"
          variant="secondary"
          onPress={() => navigation.navigate("Addresses")}
        />
      </View>

      <View style={{ marginTop: "auto" }}>
        <Button label="تسجيل الخروج" onPress={signOut} variant="ghost" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  name: { fontSize: fontSize.h3, fontWeight: fontWeight.extrabold, color: colors.text, textAlign: "right" },
  muted: { color: colors.textMuted, fontSize: fontSize.small, textAlign: "right", marginTop: 2 },
  section: { gap: spacing.sm + 2 },
});
