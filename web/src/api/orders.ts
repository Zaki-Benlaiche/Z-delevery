import { api } from "./client";
import type { Order, OrderStatus } from "./types";

export const ordersApi = {
  list: (status?: OrderStatus) =>
    api.get<Order[]>(`/orders${status ? `?status=${status}` : ""}`),

  detail: (id: string) => api.get<Order>(`/orders/${id}`),

  setStatus: (id: string, status: OrderStatus) =>
    api.post<Order>(`/orders/${id}/status`, { status }),
};
