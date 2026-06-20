import { useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer, type NavigationContainerRef } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../auth/context";
import { merchantsApi } from "../api/merchants";
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

  // ملكية المتجر هي مصدر الحقيقة للوحة التاجر (كما في الواب): من يملك متجراً يدخل لوحته
  // حتى لو بقي دوره customer لسبب ما. السائق له تطبيقه الخاص ولا يُستعلَم عن متجر.
  const isDriver = user?.role === "driver";
  const myStore = useQuery({
    queryKey: ["my-merchant"],
    queryFn: merchantsApi.mine,
    enabled: !!user && !isDriver,
    retry: false,
    staleTime: 60_000,
  });

  const isMerchant = !isDriver && (user?.role === "merchant" || !!myStore.data);
  // ننتظر نتيجة استعلام المتجر قبل الحسم حتى لا تومض واجهة الزبون ثم تتبدّل
  const resolvingStore = !!user && !isDriver && user.role !== "merchant" && myStore.isLoading;

  if (loading || resolvingStore) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // التوجيه: سائق → تطبيق السائق، تاجر/مالك متجر → لوحة إدارة المتجر، وإلا (ضيف/زبون) → تطبيق الزبون
  const content = isDriver ? (
    <DriverNavigator />
  ) : isMerchant ? (
    <MerchantNavigator />
  ) : (
    <AppNavigator />
  );

  return <NavigationContainer ref={navRef}>{content}</NavigationContainer>;
}
