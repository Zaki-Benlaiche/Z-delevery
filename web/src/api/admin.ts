/** عميل API للوحة الأدمن — يستهلك مسارات /admin المحميّة بدور ADMIN */
import { api } from "./client";
import type { MerchantType, OrderStatus } from "./types";

export interface PlatformStats {
  merchants: number;
  drivers: number;
  orders: number;
  sales: number;
  pending_orders: number;
}

export interface AdminMerchant {
  id: string;
  name: string;
  type: MerchantType;
  is_open: boolean;
  rating: number;
}

export interface AdminOrder {
  id: string;
  status: OrderStatus;
  total: number;
  items_count: number;
  created_at: string;
}

export interface AdminDriver {
  id: string;
  user_id: string;
  vehicle_type: string | null;
  license_url: string | null;
  is_verified: boolean;
  is_online: boolean;
  rating: number;
  current_location: { lat: number; lng: number } | null;
}

export const adminApi = {
  stats: () => api.get<PlatformStats>("/admin/stats"),

  merchants: () => api.get<AdminMerchant[]>("/admin/merchants"),
  toggleMerchant: (id: string) => api.post<{ id: string; is_open: boolean }>(`/admin/merchants/${id}/toggle`),
  deleteMerchant: (id: string) => api.del<void>(`/admin/merchants/${id}`),

  orders: () => api.get<AdminOrder[]>("/admin/orders"),

  drivers: () => api.get<AdminDriver[]>("/admin/drivers"),
  pendingDrivers: () => api.get<AdminDriver[]>("/admin/drivers/pending"),
  verifyDriver: (id: string) => api.post<AdminDriver>(`/admin/drivers/${id}/verify`),
  unverifyDriver: (id: string) => api.post<AdminDriver>(`/admin/drivers/${id}/unverify`),
};
