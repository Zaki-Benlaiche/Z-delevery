import { api } from "./client";
import type { Offer } from "./types";

export interface OfferPayload {
  title: string;
  subtitle?: string | null;
  image_url?: string | null;
  discount_pct?: number | null;
  badge_text?: string | null;
  is_active?: boolean;
}

export const offersApi = {
  mine: () => api.get<Offer[]>("/offers/mine"),
  create: (payload: OfferPayload) => api.post<Offer>("/offers", payload),
  update: (id: string, payload: Partial<OfferPayload>) =>
    api.patch<Offer>(`/offers/${id}`, payload),
  remove: (id: string) => api.del<void>(`/offers/${id}`),
};
