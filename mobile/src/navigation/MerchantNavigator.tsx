import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";

import { Icon, type IconName } from "../components/Icon";
import { merchantsApi } from "../api/merchants";
import { AccountScreen } from "../screens/AccountScreen";
import { AboutScreen } from "../screens/AboutScreen";
import { FeedbackScreen } from "../screens/FeedbackScreen";
import { MerchantOrdersScreen } from "../screens/merchant/MerchantOrdersScreen";
import { MerchantProductsScreen } from "../screens/merchant/MerchantProductsScreen";
import { MerchantOffersScreen } from "../screens/merchant/MerchantOffersScreen";
import { useT } from "../i18n";
import { colors, fontSize, fontWeight, spacing } from "../theme/colors";
import type { MerchantStackParamList, MerchantTabParamList } from "./types";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Tab = createBottomTabNavigator<MerchantTabParamList>();
const Stack = createNativeStackNavigator<MerchantStackParamList>();

function tabIcon(name: IconName, focused: IconName) {
  return ({ focused: f, color }: { focused: boolean; color: string }) => (
    <Icon name={f ? focused : name} size={22} color={color} />
  );
}

function MerchantTabs() {
  const { t } = useT();
  const bottomInset = useSafeAreaInsets().bottom;
  // نوع المتجر يحدّد التبويبات: العيادة = طابور + حساب فقط (بلا منتجات/عروض)
  const store = useQuery({ queryKey: ["my-merchant"], queryFn: merchantsApi.mine, retry: false });
  const isClinic = store.data?.type === "clinic";
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold, marginTop: 2 },
        tabBarStyle: [
          styles.tabBar,
          {
            height: 62 + bottomInset + spacing.sm,
            paddingBottom: (bottomInset > 0 ? bottomInset : spacing.sm) + spacing.sm,
          },
        ],
        tabBarItemStyle: { paddingTop: spacing.xs },
      }}
    >
      <Tab.Screen
        name="MerchantOrdersTab"
        component={MerchantOrdersScreen}
        options={{
          tabBarLabel: isClinic ? "الطابور" : "الطلبات",
          tabBarIcon: isClinic ? tabIcon("ticket", "ticket") : tabIcon("receipt", "receiptFill"),
        }}
      />
      {!isClinic ? (
        <Tab.Screen
          name="MerchantProductsTab"
          component={MerchantProductsScreen}
          options={{ tabBarLabel: "منتجاتي", tabBarIcon: tabIcon("bag", "bag") }}
        />
      ) : null}
      {!isClinic ? (
        <Tab.Screen
          name="MerchantOffersTab"
          component={MerchantOffersScreen}
          options={{ tabBarLabel: "العروض", tabBarIcon: tabIcon("tag", "tag") }}
        />
      ) : null}
      <Tab.Screen
        name="MerchantAccountTab"
        component={AccountScreen as React.ComponentType}
        options={{ tabBarLabel: t("tab.account"), tabBarIcon: tabIcon("person", "personFill") }}
      />
    </Tab.Navigator>
  );
}

export function MerchantNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MerchantTabs" component={MerchantTabs} options={{ headerShown: false }} />
      <Stack.Screen name="About" component={AboutScreen as React.ComponentType} options={{ headerShown: false }} />
      <Stack.Screen name="Feedback" component={FeedbackScreen as React.ComponentType} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.background,
  },
});
