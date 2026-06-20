/** سياق المصادقة — يحفظ حالة الجلسة ويعيد توجيه التنقّل */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { authApi } from "../api/auth";
import { pushApi } from "../api/push";
import type { UserRole } from "../api/types";
import { tokenStorage, type StoredUser } from "./storage";

interface AuthState {
  loading: boolean;
  user: StoredUser | null;
  signIn: (phone: string, code: string, name?: string, role?: UserRole) => Promise<void>;
  /** تسجيل سريع: يطلب الرمز ويؤكّده تلقائياً (للتسجيل عند الطلب — بلا شاشة رمز) */
  quickSignIn: (phone: string, name?: string, role?: UserRole) => Promise<void>;
  /** تحديث الدور محليّاً (بعد ترقية المستخدم لتاجر/سائق على الخادم) */
  setRole: (role: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);
  const queryClient = useQueryClient();

  // إعادة بناء الجلسة عند الإقلاع
  useEffect(() => {
    tokenStorage.getUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthState>(() => {
    const applyTokens = async (tokens: Awaited<ReturnType<typeof authApi.verifyOtp>>) => {
      const u: StoredUser = { user_id: tokens.user_id, role: tokens.role };
      await tokenStorage.save(tokens.access_token, tokens.refresh_token, u);
      setUser(u);
    };
    return {
      loading,
      user,
      async signIn(phone, code, name, role = "customer") {
        await applyTokens(await authApi.verifyOtp(phone, code, name, role));
      },
      async quickSignIn(phone, name, role = "customer") {
        const { dev_otp } = await authApi.sendOtp(phone);
        if (!dev_otp) throw new Error("التسجيل التلقائي غير متاح حالياً — حاول لاحقاً");
        await applyTokens(await authApi.verifyOtp(phone, dev_otp, name, role));
      },
      async setRole(role) {
        if (!user) return;
        const u: StoredUser = { ...user, role };
        await tokenStorage.setUser(u);
        setUser(u);
      },
      async signOut() {
        // نمسح توكن الـ push من الخادم قبل إفراغ التوكنات (الـ DELETE يحتاج auth)
        try {
          await pushApi.clear();
        } catch {
          // إن فشل الاتصال نتابع — لا نمنع المستخدم من الخروج
        }
        await tokenStorage.clear();
        setUser(null);
        // نفرغ كاش الاستعلامات حتى لا تبقى بيانات المستخدم السابق (الاسم/الأفاتار/الملف) معروضة
        queryClient.clear();
      },
    };
  }, [loading, user, queryClient]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth يجب أن يُستخدم داخل AuthProvider");
  return ctx;
}
