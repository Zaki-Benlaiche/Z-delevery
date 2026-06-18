import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { Icon, type IconName } from "../components/Icon";
import { AccountScreen } from "../screens/AccountScreen";
import { MerchantOrdersScreen } from "../screens/merchant/MerchantOrdersScreen";
import { MerchantProductsScreen } from "../screens/merchant/MerchantProductsScreen";
import { MerchantOffersScreen } from "../screens/merchant/MerchantOffersScreen";
import { useT } from "../i18n";
import { colors, fontSize, fontWeight, spacing } from "../theme/colors";
import type { MerchantTabParamList } from "./types";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Tab = createBottomTabNavigator<MerchantTabParamList>();

function tabIcon(name: IconName, focused: IconName) {
  return ({ focused: f, color }: { focused: boolean; color: string }) => (
    <Icon name={f ? focused : name} size={22} color={color} />
  );
}

export function MerchantNavigator() {
  const { t } = useT();
  const bottomInset = useSafeAreaInsets().bottom;
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
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderSoft,
    backgroundColor: colors.background,
  },
});
