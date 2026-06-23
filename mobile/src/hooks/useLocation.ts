/** Hook لجلب موقع المستخدم الحالي (مع طلب الإذن) */
import { useEffect, useState } from "react";
import * as Location from "expo-location";

export interface CurrentLocation {
  lat: number;
  lng: number;
}

export interface LocationState {
  loading: boolean;
  location: CurrentLocation | null;
  error: string | null;
}

export function useCurrentLocation(): LocationState {
  const [state, setState] = useState<LocationState>({
    loading: true,
    location: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        if (!cancelled)
          setState({ loading: false, location: null, error: "لم يُمنح إذن الموقع" });
        return;
      }
      try {
        // تحديد دقيق بمهلة 8ث كي لا تتعلّق الواجهة لو كان GPS بطيئاً/مغلقاً،
        // ثم احتياطي بآخر موقع معروف.
        let pos = await Promise.race([
          Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 8000)),
        ]);
        if (!pos) pos = await Location.getLastKnownPositionAsync();
        if (!cancelled)
          setState({
            loading: false,
            location: pos ? { lat: pos.coords.latitude, lng: pos.coords.longitude } : null,
            error: pos ? null : "تعذّر تحديد الموقع",
          });
      } catch (e) {
        if (!cancelled)
          setState({ loading: false, location: null, error: (e as Error).message });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
