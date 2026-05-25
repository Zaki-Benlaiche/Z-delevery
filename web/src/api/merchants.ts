import { api } from "./client";
import type { MerchantDetail, MerchantType, Product } from "./types";

interface MerchantCreatePayload {
  name: string;
  type: MerchantType;
  description?: string | null;
  logo_url?: string | null;
  open_hours?: string | null;
  lat: number;
  lng: number;
}

interface MerchantUpdatePayload {
  name?: string;
  description?: string | null;
  logo_url?: string | null;
  open_hours?: string | null;
  is_open?: boolean;
  lat?: number;
  lng?: number;
}

interface ProductCreatePayload {
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  category?: string | null;
  available?: boolean;
}

export const merchantsApi = {
  detail: (id: string) => api.get<MerchantDetail>(`/merchants/${id}`),

  create: (payload: MerchantCreatePayload) =>
    api.post<MerchantDetail>("/merchants", payload),

  update: (id: string, payload: MerchantUpdatePayload) =>
    api.patch<MerchantDetail>(`/merchants/${id}`, payload),

  addProduct: (merchantId: string, payload: ProductCreatePayload) =>
    api.post<Product>(`/merchants/${merchantId}/products`, payload),

  updateProduct: (merchantId: string, productId: string, payload: Partial<ProductCreatePayload>) =>
    api.patch<Product>(`/merchants/${merchantId}/products/${productId}`, payload),

  deleteProduct: (merchantId: string, productId: string) =>
    api.del<void>(`/merchants/${merchantId}/products/${productId}`),
};
