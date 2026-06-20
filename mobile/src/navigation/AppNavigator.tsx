import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "../components/Icon";
import { useT } from "../i18n";
import { AccountScreen } from "../screens/AccountScreen";
import { AddAddressScreen } from "../screens/AddAddressScreen";
import { AddressesScreen } from "../screens/AddressesScreen";
import { CartScreen } from "../screens/CartScreen";
import { ConnexionScreen } from "../screens/ConnexionScreen";
import { FavoritesScreen } from "../screens/FavoritesScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { MerchantScreen } from "../screens/MerchantScreen";
import { OrdersScreen } from "../screens/OrdersScreen";
import { OrderTrackingScreen } from "../screens/OrderTrackingScreen";
import { PartnerScreen } from "../screens/PartnerScreen";
import { colors, fontSize, fontWeight, radii, shadows, spacing } from "../theme/colors";
import type { AppStackParamList, AppTabParamList } from "./types";

const Tab = createBottomTabNavigator<AppTabParamList>();
const Stack = createNativeStackNavigator<AppStackParamList>();

function tabIcon(name: IconName, nameFocused: IconName) {
  return ({ focused, color }: { focused: boolean; color: string }) => (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Icon name={focused ? nameFocused : name} size={22} color={color} />
    </View>
  );
}

function Tabs() {
  const { t } = useT();
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom;
  return (
    <Tab.Navigator
      initialRouteName="HomeTab"
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
        tabBarItemStyle: { paddingTop: spacing.sm },
      }}
    >
      <Tab.Screen
        name="AccountTab"
        component={AccountScreen}
        options={{ tabBarLabel: t("tab.account"), tabBarIcon: tabIcon("person", "personFill") }}
      />
      <Tab.Screen
        name="OrdersTab"
        component={OrdersScreen}
        options={{ tabBarLabel: t("tab.orders"), tabBarIcon: tabIcon("receipt", "receiptFill") }}
      />
      <Tab.Screen
        name="FavoritesTab"
        component={FavoritesScreen}
        options={{ tabBarLabel: t("tab.favorites"), tabBarIcon: tabIcon("heartOutline", "heartFill") }}
      />
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: t("tab.home"), tabBarIcon: tabIcon("home", "homeFill") }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
      <Stack.Screen name="Merchant" component={MerchantScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Cart" component={CartScreen} options={{ title: "السلّة" }} />
      <Stack.Screen name="Addresses" component={AddressesScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AddAddress" component={AddAddressScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="OrderTracking"
        component={OrderTrackingScreen}
        options={{ title: "تتبّع الطلب" }}
      />
      <Stack.Screen name="Partner" component={PartnerScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="Connexion"
        component={ConnexionScreen}
        options={{ headerShown: false, presentation: "modal" }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
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
