import type { OrderStatus } from "../api/types";
import { colors, statusLabel } from "../theme";

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      style={{
        background: colors.status[status],
        color: "#fff",
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        display: "inline-block",
      }}
    >
      {statusLabel[status]}
    </span>
  );
}
