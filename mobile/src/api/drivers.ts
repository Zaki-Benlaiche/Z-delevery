import { api } from "./client";
import type { Order, OrderStatus } from "./types";

export interface Driver {
  id: string;
  user_id: string;
  vehicle_type: string;
  license_url: string | null;
  is_verified: boolean;
  is_online: boolean;
  rating: number;
  current_location: { lat: number; lng: number } | null;
}

export const driversApi = {
  register: (payload: { vehicle_type: string; license_url?: string }) =>
    api.post<Driver>("/drivers/register", payload),

  me: () => api.get<Driver>("/drivers/me"),

  setOnline: (online: boolean) =>
    api.post<Driver>(`/drivers/online?is_online=${online}`),

  updateLocation: (lat: number, lng: number) =>
    api.post<Driver>("/drivers/location", { lat, lng }),

  availableOrders: (lat?: number, lng?: number) => {
    const qs = new URLSearchParams();
    if (lat != null) qs.set("lat", String(lat));
    if (lng != null) qs.set("lng", String(lng));
    const suffix = qs.toString() ? `?${qs}` : "";
    return api.get<Order[]>(`/drivers/available-orders${suffix}`);
  },

  claim: (orderId: string) =>
    api.post<Order>(`/drivers/orders/${orderId}/claim`),

  // مشتركة مع الزبون، لكنّها مفيدة للسائق لتغيير حالة الطلب
  setStatus: (orderId: string, status: OrderStatus) =>
    api.post<Order>(`/orders/${orderId}/status`, { status }),
};
