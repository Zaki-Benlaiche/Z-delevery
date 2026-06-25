import { api } from "./client";
import type { Merchant, MerchantDetail, MerchantType, Product } from "./types";

export interface MerchantCreatePayload {
  name: string;
  type: MerchantType;
  description?: string | null;
  open_hours?: string | null;
  lat: number;
  lng: number;
}

export interface ProductPayload {
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  category?: string | null;
  available?: boolean;
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

  update: (id: string, payload: Partial<{ name: string; type: MerchantType; description: string | null; open_hours: string | null; is_open: boolean; logo_url: string | null }>) =>
    api.patch<MerchantDetail>(`/merchants/${id}`, payload),

  addProduct: (merchantId: string, payload: ProductPayload) =>
    api.post<Product>(`/merchants/${merchantId}/products`, payload),

  updateProduct: (merchantId: string, productId: string, payload: Partial<ProductPayload>) =>
    api.patch<Product>(`/merchants/${merchantId}/products/${productId}`, payload),

  deleteProduct: (merchantId: string, productId: string) =>
    api.del<void>(`/merchants/${merchantId}/products/${productId}`),
};
