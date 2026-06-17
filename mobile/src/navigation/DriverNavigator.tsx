import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const bottomInset = useSafeAreaInsets().bottom;
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
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
