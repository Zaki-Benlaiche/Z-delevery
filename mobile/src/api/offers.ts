import { api } from "./client";
import type { Offer } from "./types";

export const offersApi = {
  /** العروض المفعّلة لكل المتاجر — كاروسيل الرئيسية */
  list: () => api.get<Offer[]>("/offers"),

  // ---------- إدارة التاجر ----------
  mine: () => api.get<Offer[]>("/offers/mine"),
  create: (body: Partial<Offer>) => api.post<Offer>("/offers", body),
  update: (id: string, body: Partial<Offer>) => api.patch<Offer>(`/offers/${id}`, body),
  remove: (id: string) => api.del<void>(`/offers/${id}`),
};
