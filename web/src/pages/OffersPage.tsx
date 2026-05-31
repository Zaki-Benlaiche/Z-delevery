import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { offersApi } from "../api/offers";
import type { Offer } from "../api/types";
import { useMyMerchant } from "../hooks/useMyMerchant";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { colors } from "../theme";

export function OffersPage() {
  const merchant = useMyMerchant();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Offer | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Offer | null>(null);

  const offers = useQuery({
    queryKey: ["my-offers"],
    queryFn: offersApi.mine,
    enabled: !!merchant.data,
  });

  const remove = useMutation({
    mutationFn: (id: string) => offersApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-offers"] });
      toast.success("تم حذف العرض");
      setConfirmDelete(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      offersApi.update(id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-offers"] }),
  });

  if (merchant.isLoading) return <div className="muted">...جاري التحميل</div>;
  if (!merchant.data) return <div className="muted">لا يوجد متجر</div>;

  const list = offers.data ?? [];

  return (
    <div>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>العروض ({list.length})</h1>
          <p className="muted" style={{ fontSize: 13, marginTop: 4 }}>
            تظهر العروض المفعّلة في رئيسية تطبيق الزبون
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + إضافة عرض
        </button>
      </div>

      {list.length === 0 ? (
        <div className="muted" style={{ textAlign: "center", padding: 40 }}>
          لم تُضف عروضاً بعد
        </div>
      ) : (
        <div style={styles.grid}>
          {list.map((o) => {
            const badge = o.badge_text ?? (o.discount_pct != null ? `${o.discount_pct}% خصم` : null);
            return (
              <div key={o.id} className="card" style={{ ...styles.offerCard, opacity: o.is_active ? 1 : 0.55 }}>
                <div style={styles.banner}>
                  {badge && <span style={styles.badge}>{badge}</span>}
                  <div style={styles.bannerTitle}>{o.title}</div>
                  {o.subtitle && <div style={styles.bannerSub}>{o.subtitle}</div>}
                </div>
                <div style={styles.offerActions}>
                  <label style={styles.availToggle}>
                    <input
                      type="checkbox"
                      checked={o.is_active}
                      onChange={() => toggleActive.mutate({ id: o.id, is_active: !o.is_active })}
                    />
                    <span style={{ fontSize: 12 }}>{o.is_active ? "مفعّل" : "متوقّف"}</span>
                  </label>
                  <button className="btn btn-secondary" onClick={() => setEditing(o)}>
                    تعديل
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ color: colors.danger }}
                    onClick={() => setConfirmDelete(o)}
                  >
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(showAdd || editing) && (
        <OfferDialog
          offer={editing}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
        />
      )}

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="حذف العرض"
        width={420}
        footer={
          <>
            <button
              className="btn btn-primary"
              style={{ flex: 1, background: colors.danger }}
              onClick={() => confirmDelete && remove.mutate(confirmDelete.id)}
              disabled={remove.isPending}
            >
              {remove.isPending ? "..." : "حذف"}
            </button>
            <button className="btn btn-secondary" onClick={() => setConfirmDelete(null)}>
              إلغاء
            </button>
          </>
        }
      >
        <p style={{ color: "var(--text-muted)" }}>
          هل أنت متأكّد من حذف <b style={{ color: "var(--text)" }}>{confirmDelete?.title}</b>؟ لا يمكن التراجع.
        </p>
      </Modal>
    </div>
  );
}

interface DialogProps {
  offer: Offer | null;
  onClose: () => void;
}

function OfferDialog({ offer, onClose }: DialogProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [title, setTitle] = useState(offer?.title ?? "");
  const [subtitle, setSubtitle] = useState(offer?.subtitle ?? "");
  const [discount, setDiscount] = useState(offer?.discount_pct != null ? String(offer.discount_pct) : "");
  const [badgeText, setBadgeText] = useState(offer?.badge_text ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const d = discount.trim() ? parseInt(discount, 10) : null;
      const payload = {
        title,
        subtitle: subtitle || null,
        discount_pct: d,
        badge_text: badgeText || null,
      };
      return offer ? offersApi.update(offer.id, payload) : offersApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-offers"] });
      toast.success(offer ? "تم تحديث العرض" : "تمّت إضافة العرض");
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  const submit = () => {
    setError(null);
    if (!title.trim()) return setError("عنوان العرض مطلوب");
    if (discount.trim()) {
      const d = parseInt(discount, 10);
      if (Number.isNaN(d) || d < 1 || d > 100) return setError("نسبة الخصم بين 1 و 100");
    }
    save.mutate();
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={offer ? "تعديل العرض" : "إضافة عرض"}
      width={480}
      footer={
        <>
          <button className="btn btn-primary" onClick={submit} disabled={save.isPending} style={{ flex: 1 }}>
            {save.isPending ? "..." : "حفظ"}
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            إلغاء
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="field">
          <label>العنوان *</label>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="مثال: خصم على البيتزا" />
        </div>
        <div className="field">
          <label>الوصف</label>
          <input className="input" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="مثال: على جميع الأحجام" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field">
            <label>نسبة الخصم %</label>
            <input
              className="input"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              type="number"
              min={1}
              max={100}
              placeholder="30"
            />
          </div>
          <div className="field">
            <label>شارة مخصّصة</label>
            <input
              className="input"
              value={badgeText}
              onChange={(e) => setBadgeText(e.target.value)}
              placeholder="مثال: كاش باك 20%"
            />
          </div>
        </div>
        <p className="muted" style={{ fontSize: 12 }}>
          إن تركت الشارة المخصّصة فارغة، تُعرض نسبة الخصم تلقائياً.
        </p>
      </div>

      {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
    </Modal>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 800 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 },
  offerCard: { display: "flex", flexDirection: "column", gap: 12 },
  banner: {
    position: "relative",
    borderRadius: 12,
    padding: 18,
    minHeight: 92,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryDark})`,
    color: "#fff",
  },
  badge: {
    position: "absolute",
    top: 12,
    insetInlineStart: 12,
    background: "rgba(255,255,255,0.95)",
    color: colors.text,
    fontSize: 12,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 999,
  },
  bannerTitle: { fontSize: 17, fontWeight: 800 },
  bannerSub: { fontSize: 13, opacity: 0.92, marginTop: 2 },
  offerActions: { display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" },
  availToggle: { display: "flex", gap: 6, alignItems: "center", cursor: "pointer", marginInlineEnd: "auto" },
};
