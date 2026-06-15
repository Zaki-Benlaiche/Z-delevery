import { api } from "./client";
import type { Order, OrderCreatePayload, OrderStatus, TrackingEntry } from "./types";

export const ordersApi = {
  create: (payload: OrderCreatePayload) => api.post<Order>("/orders", payload),

  list: (status?: OrderStatus) =>
    api.get<Order[]>(`/orders${status ? `?status=${status}` : ""}`),

  detail: (id: string) => api.get<Order>(`/orders/${id}`),

  tracking: (id: string) => api.get<TrackingEntry[]>(`/orders/${id}/tracking`),

  cancel: (id: string) => api.post<Order>(`/orders/${id}/cancel`),

  setStatus: (id: string, status: OrderStatus) =>
    api.post<Order>(`/orders/${id}/status`, { status }),
};
