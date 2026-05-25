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
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (!cancelled)
          setState({
            loading: false,
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
            error: null,
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
