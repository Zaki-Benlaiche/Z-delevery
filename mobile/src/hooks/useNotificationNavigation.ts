/** يفتح الشاشة المناسبة عند الضغط على إشعار push (سائق→تفاصيل الطلب، زبون→تتبّع الطلب). */
import { useEffect } from "react";
import type { RefObject } from "react";
import * as Notifications from "expo-notifications";
import type { NavigationContainerRef } from "@react-navigation/native";

export function useNotificationNavigation(
  navRef: RefObject<NavigationContainerRef<Record<string, object | undefined>> | null>,
) {
  // يُعيد آخر استجابة (يشمل فتح التطبيق البارد من إشعار)
  const response = Notifications.useLastNotificationResponse();

  useEffect(() => {
    const data = response?.notification.request.content.data as
      | { screen?: string; order_id?: string }
      | undefined;
    const nav = navRef.current;
    if (!data?.order_id || !nav) return;

    const params = { orderId: data.order_id };
    const navigate = nav.navigate as (screen: string, params: object) => void;
    if (data.screen === "DriverOrder") {
      navigate("DriverOrder", params);
    } else if (data.screen === "OrderTracking" || data.screen === "OrderDetail") {
      navigate("OrderTracking", params);
    }
  }, [response, navRef]);
}
