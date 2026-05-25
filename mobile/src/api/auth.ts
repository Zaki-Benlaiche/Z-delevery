import { api } from "./client";
import type { TokenResponse, UserRole } from "./types";

export const authApi = {
  sendOtp: (phone: string) =>
    api.post<{ message: string; dev_otp: string | null }>(
      "/auth/send-otp",
      { phone },
      { auth: false },
    ),

  verifyOtp: (phone: string, code: string, name?: string, role: UserRole = "customer") =>
    api.post<TokenResponse>(
      "/auth/verify-otp",
      { phone, code, name, role },
      { auth: false },
    ),
};
