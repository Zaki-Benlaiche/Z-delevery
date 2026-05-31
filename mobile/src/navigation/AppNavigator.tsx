import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Platform, StyleSheet, Text, View } from "react-native";

import { AccountScreen } from "../screens/AccountScreen";
import { AddAddressScreen } from "../screens/AddAddressScreen";
import { AddressesScreen } from "../screens/AddressesScreen";
import { CartScreen } from "../screens/CartScreen";
import { FavoritesScreen } from "../screens/FavoritesScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { MerchantScreen } from "../screens/MerchantScreen";
import { OrdersScreen } from "../screens/OrdersScreen";
import { OrderTrackingScreen } from "../screens/OrderTrackingScreen";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "./types";

const Tab = createBottomTabNavigator<AppTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function tabIcon(emoji: string) {
  return ({ focused, color }: { focused: boolean; color: string }) => (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={{ fontSize: 19, color }}>{emoji}</Text>
    </View>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold, marginTop: 2 },
        tabBarStyle: styles.tabBar,
        tabBarItemStyle: { paddingTop: spacing.sm },
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: "الرئيسية", tabBarIcon: tabIcon("🏠") }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{ tabBarLabel: "المفضلة", tabBarIcon: tabIcon("❤️") }}
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

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === "ios" ? 84 : 66,
    paddingBottom: Platform.OS === "ios" ? 24 : spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    ...shadows.lg,
  },
  iconWrap: {
    width: 44,
    height: 30,
    borderRadius: radii.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: colors.primarySoft },
});
