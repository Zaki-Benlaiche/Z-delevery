import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { useAuth } from "./auth/context";
import { useMyMerchant } from "./hooks/useMyMerchant";
import { LoginPage } from "./pages/LoginPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SetupPage } from "./pages/SetupPage";

/** يحرس الطرق الخاصّة بالتاجر — يعيد التوجيه حسب حالة المصادقة والمتجر */
function Guarded({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const merchant = useMyMerchant();

  if (loading || (user && merchant.isLoading))
    return <div style={{ padding: 40 }}>...</div>;

  if (!user) return <Navigate to="/login" replace />;
  if (!merchant.data) return <Navigate to="/setup" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/orders" replace /> : <LoginPage />}
      />
      <Route
        path="/setup"
        element={user ? <SetupPage /> : <Navigate to="/login" replace />}
      />
      <Route path="/orders" element={<Guarded><OrdersPage /></Guarded>} />
      <Route path="/products" element={<Guarded><ProductsPage /></Guarded>} />
      <Route path="/settings" element={<Guarded><SettingsPage /></Guarded>} />
      <Route path="*" element={<Navigate to="/orders" replace />} />
    </Routes>
  );
}
