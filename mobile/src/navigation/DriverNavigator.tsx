import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform, StyleSheet } from "react-native";

import { Icon, type IconName } from "../components/Icon";
import { AccountScreen } from "../screens/AccountScreen";
import { OrdersScreen } from "../screens/OrdersScreen";
import { DriverHomeScreen } from "../screens/driver/DriverHomeScreen";
import { DriverOrderScreen } from "../screens/driver/DriverOrderScreen";
import { colors, fontSize, fontWeight, spacing } from "../theme/colors";
import type { DriverStackParamList, DriverTabParamList } from "./types";

const Tab = createBottomTabNavigator<DriverTabParamList>();
const Stack = createNativeStackNavigator<DriverStackParamList>();

function tabIcon(name: IconName, focused: IconName) {
  return ({ focused: f, color }: { focused: boolean; color: string }) => (
    <Icon name={f ? focused : name} size={22} color={color} />
  );
}

function DriverTabs() {
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
        name="DriverHomeTab"
        component={DriverHomeScreen}
        options={{ tabBarLabel: "العمل", tabBarIcon: tabIcon("scooter", "scooter") }}
      />
      <Tab.Screen
        name="DriverHistoryTab"
        component={OrdersScreen as React.ComponentType}
        options={{ tabBarLabel: "السجلّ", tabBarIcon: tabIcon("receipt", "receiptFill") }}
      />
      <Tab.Screen
        name="DriverAccountTab"
        component={AccountScreen as React.ComponentType}
        options={{ tabBarLabel: "حسابي", tabBarIcon: tabIcon("person", "personFill") }}
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

export function DriverNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="DriverTabs" component={DriverTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="DriverOrder"
        component={DriverOrderScreen}
        options={{ title: "تفاصيل الطلب" }}
      />
    </Stack.Navigator>
  );
}
