import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { merchantsApi } from "../api/merchants";
import type { Product } from "../api/types";
import { useMyMerchant } from "../hooks/useMyMerchant";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { colors } from "../theme";

export function ProductsPage() {
  const merchant = useMyMerchant();
  const queryClient = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState<Product | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const remove = useMutation({
    mutationFn: (id: string) => merchantsApi.deleteProduct(merchant.data!.id, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-merchant"] });
      toast.success("تم حذف المنتج");
      setConfirmDelete(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const toggleAvail = useMutation({
    mutationFn: ({ id, available }: { id: string; available: boolean }) =>
      merchantsApi.updateProduct(merchant.data!.id, id, { available }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-merchant"] }),
  });

  if (merchant.isLoading) return <div className="muted">...جاري التحميل</div>;
  if (!merchant.data) return <div className="muted">لا يوجد متجر</div>;

  const products = merchant.data.products;

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>المنتجات ({products.length})</h1>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          + إضافة منتج
        </button>
      </div>

      {products.length === 0 ? (
        <div className="muted" style={{ textAlign: "center", padding: 40 }}>
          لم تُضف منتجات بعد
        </div>
      ) : (
        <div style={styles.grid}>
          {products.map((p) => (
            <div key={p.id} className="card" style={styles.productCard}>
              <div style={{ flex: 1 }}>
                <div style={styles.productName}>{p.name}</div>
                {p.description && <div className="muted" style={{ fontSize: 13 }}>{p.description}</div>}
                <div style={styles.priceRow}>
                  <span style={styles.price}>{Number(p.price).toFixed(0)} دج</span>
                  {p.category && <span className="muted" style={{ fontSize: 12 }}>· {p.category}</span>}
                </div>
              </div>
              <div style={styles.productActions}>
                <label style={styles.availToggle}>
                  <input
                    type="checkbox"
                    checked={p.available}
                    onChange={() =>
                      toggleAvail.mutate({ id: p.id, available: !p.available })
                    }
                  />
                  <span style={{ fontSize: 12 }}>{p.available ? "متاح" : "غير متاح"}</span>
                </label>
                <button className="btn btn-secondary" onClick={() => setEditing(p)}>
                  تعديل
                </button>
                <button
                  className="btn btn-ghost"
                  style={{ color: colors.danger }}
                  onClick={() => setConfirmDelete(p)}
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showAdd || editing) && (
        <ProductDialog
          merchantId={merchant.data.id}
          product={editing}
          onClose={() => {
            setShowAdd(false);
            setEditing(null);
          }}
        />
      )}

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        title="حذف المنتج"
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
          هل أنت متأكّد من حذف <b style={{ color: "var(--text)" }}>{confirmDelete?.name}</b>؟ لا يمكن التراجع.
        </p>
      </Modal>
    </div>
  );
}

interface DialogProps {
  merchantId: string;
  product: Product | null;
  onClose: () => void;
}

function ProductDialog({ merchantId, product, onClose }: DialogProps) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [category, setCategory] = useState(product?.category ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        name,
        description: description || null,
        price: parseFloat(price),
        category: category || null,
      };
      return product
        ? merchantsApi.updateProduct(merchantId, product.id, payload)
        : merchantsApi.addProduct(merchantId, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-merchant"] });
      toast.success(product ? "تم تحديث المنتج" : "تمّت إضافة المنتج");
      onClose();
    },
    onError: (e) => setError((e as Error).message),
  });

  const submit = () => {
    setError(null);
    if (!name.trim()) return setError("اسم المنتج مطلوب");
    const p = parseFloat(price);
    if (Number.isNaN(p) || p < 0) return setError("سعر غير صالح");
    save.mutate();
  };

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={product ? "تعديل المنتج" : "إضافة منتج"}
      width={480}
      footer={
        <>
          <button
            className="btn btn-primary"
            onClick={submit}
            disabled={save.isPending}
            style={{ flex: 1 }}
          >
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
          <label>الاسم *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>الوصف</label>
          <input
            className="input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div className="field">
            <label>السعر (دج) *</label>
            <input
              className="input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              min={0}
              step="50"
            />
          </div>
          <div className="field">
            <label>الفئة</label>
            <input
              className="input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="مثال: بيتزا"
            />
          </div>
        </div>
      </div>

      {error && <div className="error" style={{ marginTop: 10 }}>{error}</div>}
    </Modal>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 800 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: 12 },
  productCard: { display: "flex", gap: 16, alignItems: "flex-start" },
  productName: { fontWeight: 700, fontSize: 15 },
  priceRow: { display: "flex", gap: 8, alignItems: "center", marginTop: 4 },
  price: { color: colors.primary, fontWeight: 700, fontSize: 15 },
  productActions: { display: "flex", flexDirection: "column", gap: 6, alignItems: "stretch" },
  availToggle: { display: "flex", gap: 6, alignItems: "center", cursor: "pointer" },
};
