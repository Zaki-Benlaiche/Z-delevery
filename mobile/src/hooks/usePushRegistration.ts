/** يطلب إذن الإشعارات ويسجّل توكن Expo Push عند الـ Backend بعد تسجيل الدخول.
 *
 * في Expo Go (SDK 56) يعمل بدون projectId. في development build / production
 * نحتاج تمرير projectId من EAS — سنُضيفه عند الانتقال لـ build حقيقي.
 */
import { useEffect } from "react";
import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

import { pushApi } from "../api/push";
import { useAuth } from "../auth/context";

// معرّف مشروع EAS — مطلوب لـ getExpoPushTokenAsync في dev/prod builds
const PROJECT_ID =
  (Constants.expoConfig?.extra?.eas as { projectId?: string } | undefined)?.projectId ??
  (Constants.easConfig as { projectId?: string } | undefined)?.projectId;

// كيف يظهر الإشعار حين يصل والتطبيق مفتوح
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function usePushRegistration() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      // المحاكي لا يدعم Push عادةً — نتجاهل بصمت
      if (!Device.isDevice) return;

      try {
        // أنشئ قناة Android (مطلوبة لـ heads-up notifications)
        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "default",
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#E85D04",
          });
        }

        let { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
          status = (await Notifications.requestPermissionsAsync()).status;
        }
        if (status !== "granted" || cancelled) return;

        const tokenData = await Notifications.getExpoPushTokenAsync(
          PROJECT_ID ? { projectId: PROJECT_ID } : undefined,
        );
        if (cancelled) return;
        await pushApi.register(tokenData.data);
      } catch {
        // الفشل ليس حرجاً — التطبيق يعمل بدون push
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);
}
