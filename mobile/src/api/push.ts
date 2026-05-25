import { api } from "./client";

export const pushApi = {
  register: (token: string) => api.post<{ ok: true }>("/me/push-token", { token }),
  clear: () => api.del<{ ok: true }>("/me/push-token"),
};
