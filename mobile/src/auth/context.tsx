/** سياق المصادقة — يحفظ حالة الجلسة ويعيد توجيه التنقّل */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { authApi } from "../api/auth";
import type { UserRole } from "../api/types";
import { tokenStorage, type StoredUser } from "./storage";

interface AuthState {
  loading: boolean;
  user: StoredUser | null;
  signIn: (phone: string, code: string, name?: string, role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  // إعادة بناء الجلسة عند الإقلاع
  useEffect(() => {
    tokenStorage.getUser().then((u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      user,
      async signIn(phone, code, name, role = "customer") {
        const tokens = await authApi.verifyOtp(phone, code, name, role);
        const u: StoredUser = { user_id: tokens.user_id, role: tokens.role };
        await tokenStorage.save(tokens.access_token, tokens.refresh_token, u);
        setUser(u);
      },
      async signOut() {
        await tokenStorage.clear();
        setUser(null);
      },
    }),
    [loading, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth يجب أن يُستخدم داخل AuthProvider");
  return ctx;
}
