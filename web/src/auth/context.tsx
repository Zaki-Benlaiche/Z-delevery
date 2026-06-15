/** سياق المصادقة للويب */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { authApi } from "../api/auth";
import type { UserRole } from "../api/types";
import { tokenStorage, type StoredUser } from "./storage";

interface AuthState {
  loading: boolean;
  user: StoredUser | null;
  signIn: (phone: string, code: string, name?: string, role?: UserRole) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<StoredUser | null>(null);

  useEffect(() => {
    setUser(tokenStorage.getUser());
    setLoading(false);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      user,
      async signIn(phone, code, name, role = "merchant") {
        const tokens = await authApi.verifyOtp(phone, code, name, role);
        const u: StoredUser = { user_id: tokens.user_id, role: tokens.role };
        tokenStorage.save(tokens.access_token, u);
        setUser(u);
      },
      signOut() {
        tokenStorage.clear();
        setUser(null);
        // إعادة تحميل كاملة → تمسح ذاكرة React Query (وإلا يبقى متجر الحساب السابق ظاهراً)
        if (typeof window !== "undefined") window.location.href = "/login";
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
