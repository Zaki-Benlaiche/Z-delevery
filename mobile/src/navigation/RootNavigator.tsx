import { useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, type NavigationContainerRef } from "@react-navigation/native";

import { useAuth } from "../auth/context";
import { usePushRegistration } from "../hooks/usePushRegistration";
import { useNotificationNavigation } from "../hooks/useNotificationNavigation";
import { colors } from "../theme/colors";
import { AppNavigator } from "./AppNavigator";
import { DriverNavigator } from "./DriverNavigator";
import { MerchantNavigator } from "./MerchantNavigator";

export function RootNavigator() {
  const { loading, user } = useAuth();
  const navRef = useRef<NavigationContainerRef<Record<string, object | undefined>>>(null);
  // يطلب الإذن ويسجّل توكن Expo Push بعد تسجيل الدخول (no-op على المحاكي)
  usePushRegistration();
  // يفتح الطلب عند الضغط على إشعار push
  useNotificationNavigation(navRef);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // التوجيه حسب الدور: سائق → تطبيق السائق، تاجر → لوحة إدارة المتجر، وإلا (ضيف/زبون) → تطبيق الزبون
  const content =
    user?.role === "driver" ? (
      <DriverNavigator />
    ) : user?.role === "merchant" ? (
      <MerchantNavigator />
    ) : (
      <AppNavigator />
    );

  return <NavigationContainer ref={navRef}>{content}</NavigationContainer>;
}
