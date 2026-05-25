/** يعيد متجر المستخدم الحالي عبر GET /merchants/me */
import { useQuery } from "@tanstack/react-query";

import { api } from "../api/client";
import type { MerchantDetail } from "../api/types";

export function useMyMerchant() {
  return useQuery({
    queryKey: ["my-merchant"],
    queryFn: () => api.get<MerchantDetail>("/merchants/me"),
    retry: false, // 404 يعني لا يوجد متجر بعد — نعرض شاشة الإعداد
  });
}
