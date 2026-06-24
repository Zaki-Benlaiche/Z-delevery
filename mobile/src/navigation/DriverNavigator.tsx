import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon, type IconName } from "../components/Icon";
import { useT } from "../i18n";
import { AccountScreen } from "../screens/AccountScreen";
import { AboutScreen } from "../screens/AboutScreen";
import { FeedbackScreen } from "../screens/FeedbackScreen";
import { DriverHomeScreen } from "../screens/driver/DriverHomeScreen";
import { DriverHistoryScreen } from "../screens/driver/DriverHistoryScreen";
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
        name="DriverHomeTab"
        component={DriverHomeScreen}
        options={{ tabBarLabel: t("tab.work"), tabBarIcon: tabIcon("scooter", "scooter") }}
      />
      <Tab.Screen
        name="DriverHistoryTab"
        component={DriverHistoryScreen}
        options={{ tabBarLabel: t("driver.earnings"), tabBarIcon: tabIcon("receipt", "receiptFill") }}
      />
      <Tab.Screen
        name="DriverAccountTab"
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

export function DriverNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="DriverTabs" component={DriverTabs} options={{ headerShown: false }} />
      <Stack.Screen
        name="DriverOrder"
        component={DriverOrderScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="About" component={AboutScreen as React.ComponentType} options={{ headerShown: false }} />
      <Stack.Screen name="Feedback" component={FeedbackScreen as React.ComponentType} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
