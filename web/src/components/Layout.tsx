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
  { to: "/offers", label: "العروض", icon: "🎟️" },
  { to: "/settings", label: "الإعدادات", icon: "⚙️" },
];

export function Layout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const merchant = useMyMerchant();
  const navigate = useNavigate();

  const initials = merchant.data?.name?.charAt(0)?.toUpperCase() ?? "Z";

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.logoBadge}>Z</div>
          <div>
            <div style={styles.brandTitle}>Z-delivry</div>
            <div style={styles.brandSub}>لوحة التاجر</div>
          </div>
        </div>

        {merchant.data && (
          <div style={styles.merchantCard}>
            <div style={styles.merchantAvatar}>{initials}</div>
            <div style={{ overflow: "hidden", flex: 1 }}>
              <div style={styles.merchantName}>{merchant.data.name}</div>
              <div style={styles.merchantStatus}>
                <span style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  background: merchant.data.is_open ? colors.success : colors.textFaint,
                  display: "inline-block",
                  marginInlineEnd: 6,
                }} />
                {merchant.data.is_open ? "مفتوح الآن" : "مغلق"}
              </div>
            </div>
          </div>
        )}

        <nav style={styles.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button
          style={styles.logoutBtn}
          onClick={() => {
            signOut();
            navigate("/login", { replace: true });
          }}
        >
          <span style={{ fontSize: 16 }}>↪</span>
          <span>تسجيل الخروج</span>
        </button>
      </aside>

      <main style={styles.main}>{children}</main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { display: "grid", gridTemplateColumns: "280px 1fr", height: "100vh" },
  sidebar: {
    background: colors.bg,
    borderInlineStart: `1px solid ${colors.borderSoft}`,
    display: "flex",
    flexDirection: "column",
    padding: 14,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 4px 16px",
    borderBottom: `1px solid ${colors.borderSoft}`,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: colors.primary,
    color: "#fff",
    fontWeight: 800,
    fontSize: 18,
    display: "grid",
    placeItems: "center",
    boxShadow: "0 4px 12px rgba(255, 107, 26, 0.35)",
  },
  brandTitle: { fontSize: 16, fontWeight: 800, color: colors.text },
  brandSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  merchantCard: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 12,
    margin: "14px 0",
    borderRadius: 12,
    background: colors.surface,
  },
  merchantAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: colors.primarySoft,
    color: colors.primary,
    fontWeight: 800,
    fontSize: 16,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  merchantName: {
    fontSize: 13,
    fontWeight: 700,
    color: colors.text,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  merchantStatus: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    display: "flex",
    alignItems: "center",
  },

  nav: { display: "flex", flexDirection: "column", gap: 4, flex: 1 },

  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "11px 14px",
    borderRadius: 12,
    color: colors.textMuted,
    fontWeight: 600,
    fontSize: 13,
    marginTop: 8,
    width: "100%",
    justifyContent: "flex-start",
  },

  main: { padding: 32, overflowY: "auto", background: colors.canvas },
};
