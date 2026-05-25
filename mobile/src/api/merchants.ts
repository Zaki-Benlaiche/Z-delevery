import { api } from "./client";
import type { Merchant, MerchantDetail } from "./types";

export const merchantsApi = {
  list: (params: { lat?: number; lng?: number; q?: string; type?: string } = {}) => {
    const qs = new URLSearchParams();
    if (params.lat != null) qs.set("lat", String(params.lat));
    if (params.lng != null) qs.set("lng", String(params.lng));
    if (params.q) qs.set("q", params.q);
    if (params.type) qs.set("type", params.type);
    const suffix = qs.toString() ? `?${qs}` : "";
    return api.get<Merchant[]>(`/merchants${suffix}`);
  },

  detail: (id: string) => api.get<MerchantDetail>(`/merchants/${id}`),
};
