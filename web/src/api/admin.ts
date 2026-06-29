/** عميل API للوحة الأدمن — يستهلك مسارات /admin المحميّة بدور ADMIN */
import { api } from "./client";
import type { MerchantType, OrderStatus } from "./types";

/** نقطة في السلسلة الزمنية اليومية */
export interface DailyPoint {
  date: string;
  orders: number;
  revenue: number;
}

export interface PlatformStats {
  // عدّادات
  merchants: number;
  open_merchants: number;
  drivers: number;
  online_drivers: number;
  verified_drivers: number;
  customers: number;
  orders: number;
  // ماليّات
  sales: number;
  commission: number;
  avg_order: number;
  delivered_orders: number;
  // نشاط
  pending_orders: number;
  active_orders: number;
  cancelled_orders: number;
  orders_today: number;
  revenue_today: number;
  // توزيع + اتجاه
  by_status: Partial<Record<OrderStatus, number>>;
  daily: DailyPoint[];
}

export interface AdminMerchant {
  id: string;
  name: string;
  type: MerchantType;
  is_open: boolean;
  rating: number;
  logo_url: string | null;
  owner_name: string | null;
  owner_phone: string | null;
  orders_count: number;
  revenue: number;
  products_count: number;
  created_at: string | null;
}

export interface AdminOrderRow {
  id: string;
  status: OrderStatus;
  total: number;
  items_count: number;
  created_at: string | null;
  delivery_fee?: number;
}

export interface AdminMerchantDetail {
  id: string;
  name: string;
  type: MerchantType;
  description: string | null;
  logo_url: string | null;
  is_open: boolean;
  rating: number;
  open_hours: string | null;
  created_at: string | null;
  owner: { name: string | null; phone: string | null } | null;
  orders_count: number;
  delivered_orders: number;
  revenue: number;
  commission: number;
  avg_order: number;
  products_count: number;
  by_status: Partial<Record<OrderStatus, number>>;
  recent_orders: AdminOrderRow[];
  top_products: { name: string; qty: number }[];
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
  owner_name: string | null;
  owner_phone: string | null;
  deliveries: number;
  earnings: number;
  active_orders: number;
  created_at: string | null;
}

export interface AdminDriverDetail {
  id: string;
  vehicle_type: string | null;
  license_url: string | null;
  is_verified: boolean;
  is_online: boolean;
  rating: number;
  current_location: { lat: number; lng: number } | null;
  created_at: string | null;
  owner: { name: string | null; phone: string | null } | null;
  total_assigned: number;
  deliveries: number;
  earnings: number;
  active_orders: number;
  by_status: Partial<Record<OrderStatus, number>>;
  recent_orders: AdminOrderRow[];
}

export interface AdminOrder {
  id: string;
  status: OrderStatus;
  total: number;
  items_count: number;
  created_at: string;
}

export const adminApi = {
  stats: () => api.get<PlatformStats>("/admin/stats"),

  merchants: () => api.get<AdminMerchant[]>("/admin/merchants"),
  merchant: (id: string) => api.get<AdminMerchantDetail>(`/admin/merchants/${id}`),
  toggleMerchant: (id: string) => api.post<{ id: string; is_open: boolean }>(`/admin/merchants/${id}/toggle`),
  deleteMerchant: (id: string) => api.del<void>(`/admin/merchants/${id}`),

  orders: () => api.get<AdminOrder[]>("/admin/orders"),

  drivers: () => api.get<AdminDriver[]>("/admin/drivers"),
  driver: (id: string) => api.get<AdminDriverDetail>(`/admin/drivers/${id}`),
  pendingDrivers: () => api.get<AdminDriver[]>("/admin/drivers/pending"),
  verifyDriver: (id: string) => api.post<{ id: string; is_verified: boolean }>(`/admin/drivers/${id}/verify`),
  unverifyDriver: (id: string) => api.post<{ id: string; is_verified: boolean }>(`/admin/drivers/${id}/unverify`),
};
