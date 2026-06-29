import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { merchantsApi } from "../api/merchants";
import { useAuth } from "../auth/context";
import { useMyMerchant } from "../hooks/useMyMerchant";
import { Icon, type IconName } from "./Icon";
import { colors } from "../theme";

const NAV: { to: string; label: string; icon: IconName }[] = [
  { to: "/orders", label: "الطلبات", icon: "orders" },
  { to: "/products", label: "المنتجات", icon: "products" },
  { to: "/offers", label: "العروض", icon: "offers" },
  { to: "/settings", label: "الإعدادات", icon: "settings" },
];

const TYPE_LABEL: Record<string, string> = { food: "مطاعم", fresh: "طازج", market: "بقالة" };

export function Layout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth();
  const merchant = useMyMerchant();
  const queryClient = useQueryClient();

  const m = merchant.data;
  const initials = m?.name?.charAt(0)?.toUpperCase() ?? "Z";
  const isOpen = m?.is_open ?? false;

  const toggleOpen = useMutation({
    mutationFn: () => merchantsApi.update(m!.id, { is_open: !isOpen }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-merchant"] }),
  });

  return (
    <div style={styles.shell}>
      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <div style={styles.logoBadge}>R</div>
          <div>
            <div style={styles.brandTitle}>Rserve-Vite</div>
            <div style={styles.brandSub}>لوحة التاجر</div>
          </div>
        </div>

        {m && (
          <div style={styles.merchantCard}>
            <div style={styles.merchantTop}>
              <div style={styles.merchantAvatar}>{initials}</div>
              <div style={{ overflow: "hidden", flex: 1 }}>
                <div style={styles.merchantName}>{m.name}</div>
                <div style={styles.merchantType}>{TYPE_LABEL[m.type] ?? m.type}</div>
              </div>
            </div>
            <button
              style={{ ...styles.statusToggle, ...(isOpen ? styles.statusOpen : styles.statusClosed) }}
              onClick={() => !toggleOpen.isPending && toggleOpen.mutate()}
              disabled={toggleOpen.isPending}
            >
              <span style={{ ...styles.statusDot, background: isOpen ? colors.success : colors.textFaint }} />
              <span style={{ flex: 1, textAlign: "start" }}>{isOpen ? "المتجر مفتوح" : "المتجر مغلق"}</span>
              <span style={{ ...styles.switchTrack, background: isOpen ? colors.success : colors.border }}>
                <span style={{ ...styles.switchKnob, transform: isOpen ? "translateX(-18px)" : "translateX(0)" }} />
              </span>
            </button>
          </div>
        )}

        <nav style={styles.nav}>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
    color: "#fff",
    fontWeight: 800,
    fontSize: 19,
    display: "grid",
    placeItems: "center",
    boxShadow: "0 6px 16px rgba(255, 107, 26, 0.4)",
  },
  brandTitle: { fontSize: 16, fontWeight: 800, color: colors.text },
  brandSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  merchantCard: {
    margin: "16px 0",
    padding: 14,
    borderRadius: 16,
    background: colors.surfaceAlt,
    border: `1px solid ${colors.borderSoft}`,
  },
  merchantTop: { display: "flex", alignItems: "center", gap: 11, marginBottom: 12 },
  merchantAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    background: colors.primarySoft,
    color: colors.primary,
    fontWeight: 800,
    fontSize: 18,
    display: "grid",
    placeItems: "center",
    flexShrink: 0,
  },
  merchantName: {
    fontSize: 14,
    fontWeight: 800,
    color: colors.text,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  merchantType: { fontSize: 11, color: colors.textMuted, marginTop: 2 },

  statusToggle: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    width: "100%",
    padding: "9px 12px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 700,
    border: "1px solid",
  },
  statusOpen: { background: "#ECFDF5", borderColor: "#A7F3D0", color: colors.success },
  statusClosed: { background: colors.surface, borderColor: colors.border, color: colors.textMuted },
  statusDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  switchTrack: {
    position: "relative",
    width: 38,
    height: 22,
    borderRadius: 22,
    flexShrink: 0,
    transition: "background .2s",
  },
  switchKnob: {
    position: "absolute",
    top: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: "50%",
    background: "#fff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
    transition: "transform .2s",
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

  main: { overflowY: "auto", background: colors.canvas },
  content: { padding: 32, maxWidth: 1100, margin: "0 auto" },
};
