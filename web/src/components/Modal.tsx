import { useEffect, type ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Modal({ open, onClose, title, children, footer, width = 520 }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>{title}</h2>
            <button
              onClick={onClose}
              aria-label="إغلاق"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                fontSize: 16,
                color: "var(--text-muted)",
              }}
            >
              ✕
            </button>
          </div>
        ) : null}

        <div>{children}</div>

        {footer ? <div style={{ marginTop: 20, display: "flex", gap: 8 }}>{footer}</div> : null}
      </div>
    </div>
  );
}
