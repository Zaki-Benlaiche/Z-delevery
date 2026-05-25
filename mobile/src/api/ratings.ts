import { api } from "./client";

export interface Rating {
  id: string;
  order_id: string;
  merchant_id: string;
  stars: number;
  comment: string | null;
  created_at: string;
}

export const ratingsApi = {
  get: (orderId: string) => api.get<Rating | null>(`/orders/${orderId}/rating`),
  create: (orderId: string, stars: number, comment?: string) =>
    api.post<Rating>(`/orders/${orderId}/rate`, { stars, comment: comment || null }),
};
