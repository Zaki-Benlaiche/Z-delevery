import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";

import { AccountScreen } from "../screens/AccountScreen";
import { OrdersScreen } from "../screens/OrdersScreen";
import { DriverHomeScreen } from "../screens/driver/DriverHomeScreen";
import { DriverOrderScreen } from "../screens/driver/DriverOrderScreen";
import { colors } from "../theme/colors";
import type { DriverStackParamList, DriverTabParamList } from "./types";

const Tab = createBottomTabNavigator<DriverTabParamList>();
const Stack = createNativeStackNavigator<DriverStackParamList>();

function tabIcon(emoji: string) {
  return ({ color }: { color: string }) => (
    <Text style={{ fontSize: 20, color }}>{emoji}</Text>
  );
}

function DriverTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { borderTopColor: colors.border, height: 60, paddingTop: 6 },
      }}
    >
      <Tab.Screen
        name="DriverHomeTab"
        component={DriverHomeScreen}
        options={{ tabBarLabel: "العمل", tabBarIcon: tabIcon("🛵") }}
      />
      <Tab.Screen
        name="DriverHistoryTab"
        // نُعيد استخدام شاشة طلبات الزبون — الـ Backend يرشّح حسب الدور تلقائياً
        component={OrdersScreen as React.ComponentType}
        options={{ tabBarLabel: "السجلّ", tabBarIcon: tabIcon("📋") }}
      />
      <Tab.Screen
        name="DriverAccountTab"
        component={AccountScreen as React.ComponentType}
        options={{ tabBarLabel: "حسابي", tabBarIcon: tabIcon("👤") }}
      />
    </Tab.Navigator>
  );
}

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
