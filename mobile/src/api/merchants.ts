import { api } from "./client";
import type { Merchant, MerchantDetail, MerchantType } from "./types";

export interface MerchantCreatePayload {
  name: string;
  type: MerchantType;
  description?: string | null;
  open_hours?: string | null;
  lat: number;
  lng: number;
}

export const merchantsApi = {
  create: (payload: MerchantCreatePayload) => api.post<MerchantDetail>("/merchants", payload),

  mine: () => api.get<MerchantDetail>("/merchants/me"),

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
