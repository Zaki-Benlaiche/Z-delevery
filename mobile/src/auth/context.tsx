/** سياق المصادقة — يحفظ حالة الجلسة ويعيد توجيه التنقّل */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  // مرجع يعكس المستخدم الحالي دائماً — يتجنّب الإغلاق القديم في الدوالّ غير المتزامنة
  const userRef = useRef<StoredUser | null>(null);
  const setUserBoth = (u: StoredUser | null) => {
    userRef.current = u;
    setUser(u);
  };

  // إعادة بناء الجلسة عند الإقلاع
  useEffect(() => {
    tokenStorage.getUser().then((u) => {
      setUserBoth(u);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<AuthState>(() => {
    const applyTokens = async (tokens: Awaited<ReturnType<typeof authApi.verifyOtp>>) => {
      const u: StoredUser = { user_id: tokens.user_id, role: tokens.role };
      await tokenStorage.save(tokens.access_token, tokens.refresh_token, u);
      setUserBoth(u);
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
        // نقرأ المستخدم الحالي من المرجع (لا من الإغلاق) حتى يعمل بعد quickSignIn مباشرةً
        const current = userRef.current;
        if (!current) return;
        const u: StoredUser = { ...current, role };
        await tokenStorage.setUser(u);
        setUserBoth(u);
      },
      async signOut() {
        // نمسح توكن الـ push من الخادم قبل إفراغ التوكنات (الـ DELETE يحتاج auth)
        try {
          await pushApi.clear();
        } catch {
          // إن فشل الاتصال نتابع — لا نمنع المستخدم من الخروج
        }
        await tokenStorage.clear();
        setUserBoth(null);
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
