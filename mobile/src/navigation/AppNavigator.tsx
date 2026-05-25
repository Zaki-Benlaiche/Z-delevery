import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Text } from "react-native";

import { AccountScreen } from "../screens/AccountScreen";
import { AddAddressScreen } from "../screens/AddAddressScreen";
import { AddressesScreen } from "../screens/AddressesScreen";
import { CartScreen } from "../screens/CartScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { MerchantScreen } from "../screens/MerchantScreen";
import { OrdersScreen } from "../screens/OrdersScreen";
import { OrderTrackingScreen } from "../screens/OrderTrackingScreen";
import { colors } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "./types";

const Tab = createBottomTabNavigator<AppTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function tabIcon(emoji: string) {
  return ({ color }: { color: string }) => (
    <Text style={{ fontSize: 20, color }}>{emoji}</Text>
  );
}

function Tabs() {
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
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: "الرئيسية", tabBarIcon: tabIcon("🏠") }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        options={{ tabBarLabel: "طلباتي", tabBarIcon: tabIcon("📦") }}
      />
      <Tab.Screen
        name="AccountTab"
        component={AccountScreen}
        options={{ tabBarLabel: "حسابي", tabBarIcon: tabIcon("👤") }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="Merchant" component={MerchantScreen} options={{ title: "" }} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: "السلّة" }} />
      <Stack.Screen name="Addresses" component={AddressesScreen} options={{ title: "عناويني" }} />
      <Stack.Screen
        name="AddAddress"
        component={AddAddressScreen}
        options={{ title: "إضافة عنوان" }}
      />
      <Stack.Screen
        name="OrderTracking"
        component={OrderTrackingScreen}
        options={{ title: "تتبّع الطلب" }}
      />
    </Stack.Navigator>
  );
}
