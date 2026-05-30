import type { OrderStatus } from "../api/types";
import { colors, statusLabel, statusSoft } from "../theme";

export function StatusBadge({ status, size = "md" }: { status: OrderStatus; size?: "sm" | "md" }) {
  const color = colors.status[status];
  const bg = statusSoft[status];
  return (
    <span
      className="pill"
      style={{
        background: bg,
        color,
        fontSize: size === "sm" ? 11 : 12,
        padding: size === "sm" ? "3px 8px" : "4px 12px",
      }}
    >
      <span className="pill-dot" style={{ background: color }} />
      {statusLabel[status]}
    </span>
  );
}
