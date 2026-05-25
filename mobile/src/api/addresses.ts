import { api } from "./client";
import type { Address } from "./types";

export const addressesApi = {
  list: () => api.get<Address[]>("/addresses"),

  create: (payload: { label: string; details?: string | null; lat: number; lng: number }) =>
    api.post<Address>("/addresses", payload),

  remove: (id: string) => api.del<void>(`/addresses/${id}`),
};
