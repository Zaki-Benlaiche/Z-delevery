import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider } from "./src/auth/context";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { enableRTL } from "./src/theme/rtl";
import { useFavorites } from "./src/store/favorites";
import { useLanguage } from "./src/i18n";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  // فرض RTL مرّة واحدة عند الإقلاع — قد يحتاج إعادة تشغيل في dev mode عند أوّل مرّة
  const [ready, setReady] = useState(false);
  useEffect(() => {
    enableRTL();
    // تحميل المفضّلة واللغة المحفوظتين محليّاً قبل عرض الواجهة
    void useFavorites.getState().hydrate();
    void useLanguage.getState().hydrate();
    setReady(true);
  }, []);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
