import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { Icon, type IconName } from "../components/Icon";
import { AccountScreen } from "../screens/AccountScreen";
import { MerchantOrdersScreen } from "../screens/merchant/MerchantOrdersScreen";
import { MerchantProductsScreen } from "../screens/merchant/MerchantProductsScreen";
import { MerchantOffersScreen } from "../screens/merchant/MerchantOffersScreen";
import { useT } from "../i18n";
import { colors, fontSize, fontWeight, spacing } from "../theme/colors";
import type { MerchantTabParamList } from "./types";
import { Platform, StyleSheet } from "react-native";

const Tab = createBottomTabNavigator<MerchantTabParamList>();

function tabIcon(name: IconName, focused: IconName) {
  return ({ focused: f, color }: { focused: boolean; color: string }) => (
    <Icon name={f ? focused : name} size={22} color={color} />
  );
}

export function MerchantNavigator() {
  const { t } = useT();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold, marginTop: 2 },
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: { paddingTop: spacing.xs },
      }}
    >
      <Tab.Screen
        name="MerchantOrdersTab"
        component={MerchantOrdersScreen}
        options={{ tabBarLabel: "الطلبات", tabBarIcon: tabIcon("receipt", "receiptFill") }}
      />
      <Tab.Screen
        name="MerchantProductsTab"
        component={MerchantProductsScreen}
        options={{ tabBarLabel: "منتجاتي", tabBarIcon: tabIcon("bag", "bag") }}
      />
      <Tab.Screen
        name="MerchantOffersTab"
        component={MerchantOffersScreen}
        options={{ tabBarLabel: "العروض", tabBarIcon: tabIcon("tag", "tag") }}
      />
      <Tab.Screen
        name="MerchantAccountTab"
        component={AccountScreen as React.ComponentType}
        options={{ tabBarLabel: t("tab.account"), tabBarIcon: tabIcon("person", "personFill") }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === "ios" ? 84 : 66,
    paddingBottom: Platform.OS === "ios" ? 24 : spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.background,
  },
});
