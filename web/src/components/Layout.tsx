import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/context";
import { useMyMerchant } from "../hooks/useMyMerchant";
import { colors } from "../theme";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const NAV: NavItem[] = [
  { to: "/orders", label: "الطلبات", icon: "📦" },
  { to: "/products", label: "المنتجات", icon: "🍕" },
  { to: "/settings", label: "الإعدادات", icon: "⚙️" },
];

export function Layout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const merchant = useMyMerchant();
  const navigate = useNavigate();

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.brandTitle}>Z-delivry</div>
          {merchant.data && <div style={styles.brandSub}>{merchant.data.name}</div>}
        </div>

        <nav style={styles.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              })}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          className="btn btn-ghost"
          style={{ margin: 16, justifyContent: "flex-start" }}
          onClick={() => {
            signOut();
            navigate("/login", { replace: true });
          }}
        >
          ↪ تسجيل الخروج
        </button>
      </aside>

      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { display: "grid", gridTemplateColumns: "260px 1fr", height: "100vh" },
  sidebar: {
    background: colors.bg,
    borderInlineStart: `1px solid ${colors.border}`,
    display: "flex",
    flexDirection: "column",
  },
  brand: { padding: "20px 16px", borderBottom: `1px solid ${colors.border}` },
  brandTitle: { fontSize: 18, fontWeight: 800, color: colors.primary },
  brandSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  nav: { padding: 8, display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 14px",
    borderRadius: 10,
    color: colors.textMuted,
    fontWeight: 600,
  },
  navItemActive: { background: "#FFF7F0", color: colors.primary },
  main: { padding: 24, overflowY: "auto", background: colors.surface },
};
