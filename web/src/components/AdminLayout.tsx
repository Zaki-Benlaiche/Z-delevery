import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

import { useAuth } from "../auth/context";
import { Icon, type IconName } from "./Icon";
import { colors } from "../theme";

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: "/admin", label: "لوحة القيادة", icon: "dashboard" },
  { to: "/admin/merchants", label: "المتاجر", icon: "store" },
  { to: "/admin/drivers", label: "السائقون", icon: "drivers" },
  { to: "/admin/orders", label: "الطلبات", icon: "orders" },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.logoBadge}>R</div>
          <div>
            <div style={styles.brandTitle}>Rserve-Vite</div>
            <div style={styles.brandSub}>لوحة الإدارة</div>
          </div>
        </div>

        <nav style={styles.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
            >
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <button style={styles.logoutBtn} onClick={signOut}>
          <Icon name="logout" size={17} />
          <span>تسجيل الخروج</span>
        </button>
      </aside>

      <main style={styles.main}>
        <div style={styles.content}>{children}</div>
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: { display: "grid", gridTemplateColumns: "276px 1fr", height: "100vh" },
  sidebar: {
    background: colors.bg,
    borderInlineStart: `1px solid ${colors.borderSoft}`,
    display: "flex",
    flexDirection: "column",
    padding: 16,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 11,
    padding: "6px 4px 18px",
    borderBottom: `1px solid ${colors.borderSoft}`,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    background: `linear-gradient(135deg, ${colors.accent}, #07686a)`,
    color: "#fff",
    fontWeight: 800,
    fontSize: 19,
    display: "grid",
    placeItems: "center",
    boxShadow: "0 6px 16px rgba(10, 147, 150, 0.4)",
  },
  brandTitle: { fontSize: 16, fontWeight: 800, color: colors.text },
  brandSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  nav: { display: "flex", flexDirection: "column", gap: 4, flex: 1, marginTop: 16 },

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

  main: { overflowY: "auto", background: colors.canvas },
  content: { padding: 32, maxWidth: 1280, margin: "0 auto" },
};
