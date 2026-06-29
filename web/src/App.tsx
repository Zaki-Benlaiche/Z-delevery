import { Navigate, Route, Routes } from "react-router-dom";

import { Layout } from "./components/Layout";
import { AdminLayout } from "./components/AdminLayout";
import { useAuth } from "./auth/context";
import { useMyMerchant } from "./hooks/useMyMerchant";
import { LoginPage } from "./pages/LoginPage";
import { OffersPage } from "./pages/OffersPage";
import { OrdersPage } from "./pages/OrdersPage";
import { ProductsPage } from "./pages/ProductsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SetupPage } from "./pages/SetupPage";
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminMerchantsPage } from "./pages/admin/AdminMerchantsPage";
import { AdminMerchantDetailPage } from "./pages/admin/AdminMerchantDetailPage";
import { AdminDriversPage } from "./pages/admin/AdminDriversPage";
import { AdminDriverDetailPage } from "./pages/admin/AdminDriverDetailPage";
import { AdminOrdersPage } from "./pages/admin/AdminOrdersPage";

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

/** منطقة الأدمن — متاحة لدور admin فقط */
function AdminArea() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminLayout><AdminDashboardPage /></AdminLayout>} />
      <Route path="/admin/merchants" element={<AdminLayout><AdminMerchantsPage /></AdminLayout>} />
      <Route path="/admin/merchants/:id" element={<AdminLayout><AdminMerchantDetailPage /></AdminLayout>} />
      <Route path="/admin/drivers" element={<AdminLayout><AdminDriversPage /></AdminLayout>} />
      <Route path="/admin/drivers/:id" element={<AdminLayout><AdminDriverDetailPage /></AdminLayout>} />
      <Route path="/admin/orders" element={<AdminLayout><AdminOrdersPage /></AdminLayout>} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div style={{ padding: 40 }}>...</div>;

  if (user?.role === "admin") return <AdminArea />;

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
      <Route path="/offers" element={<Guarded><OffersPage /></Guarded>} />
      <Route path="/settings" element={<Guarded><SettingsPage /></Guarded>} />
      <Route path="*" element={<Navigate to="/orders" replace />} />
    </Routes>
  );
}
