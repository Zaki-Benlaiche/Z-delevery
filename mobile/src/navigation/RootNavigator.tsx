import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";

import { useAuth } from "../auth/context";
import { usePushRegistration } from "../hooks/usePushRegistration";
import { colors } from "../theme/colors";
import { AppNavigator } from "./AppNavigator";
import { AuthNavigator } from "./AuthNavigator";
import { DriverNavigator } from "./DriverNavigator";

export function RootNavigator() {
  const { loading, user } = useAuth();
  // يطلب الإذن ويسجّل توكن Expo Push بعد تسجيل الدخول (no-op على المحاكي)
  usePushRegistration();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // اختيار البنية حسب دور المستخدم — كل دور يرى تجربته فقط
  const content = !user
    ? <AuthNavigator />
    : user.role === "driver"
      ? <DriverNavigator />
      : <AppNavigator />;

  return <NavigationContainer>{content}</NavigationContainer>;
}
