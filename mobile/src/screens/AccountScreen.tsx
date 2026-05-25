import { StyleSheet, Text, View } from "react-native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { Button } from "../components/Button";
import { Screen } from "../components/Screen";
import { useAuth } from "../auth/context";
import { colors } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "../navigation/types";

type Props = CompositeScreenProps<
  BottomTabScreenProps<AppTabParamList, "AccountTab">,
  NativeStackScreenProps<AppStackParamList>
>;

export function AccountScreen({ navigation }: Props) {
  const { user, signOut } = useAuth();

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>حسابي</Text>
        <Text style={styles.muted}>
          المعرّف: {user?.user_id.slice(0, 8) ?? "—"} · الدور: {user?.role ?? "—"}
        </Text>
      </View>

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
  header: { gap: 6, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "800", color: colors.text, textAlign: "right" },
  muted: { color: colors.textMuted, fontSize: 13, textAlign: "right" },
  section: { gap: 10 },
});
