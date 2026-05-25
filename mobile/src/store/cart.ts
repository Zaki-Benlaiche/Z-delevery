/** مخزن سلّة الشراء — متجر واحد فقط في وقت واحد (لا يخلط منتجات تجّار مختلفين) */
import { create } from "zustand";

import type { Product } from "../api/types";

export interface CartLine {
  product: Product;
  qty: number;
  options?: string | null;
}

interface CartState {
  merchantId: string | null;
  lines: CartLine[];
  add: (product: Product, qty?: number, options?: string | null) => void;
  remove: (productId: string) => void;
  setQty: (productId: string, qty: number) => void;
  clear: () => void;
  subtotal: () => number;
  count: () => number;
}

export const useCart = create<CartState>((set, get) => ({
  merchantId: null,
  lines: [],

  add(product, qty = 1, options = null) {
    set((s) => {
      // إذا أُضيف منتج من متجر مختلف، نمسح السلّة ونبدأ من جديد
      if (s.merchantId && s.merchantId !== product.merchant_id) {
        return { merchantId: product.merchant_id, lines: [{ product, qty, options }] };
      }
      const idx = s.lines.findIndex(
        (l) => l.product.id === product.id && (l.options ?? null) === options,
      );
      if (idx >= 0) {
        const lines = [...s.lines];
        lines[idx] = { ...lines[idx], qty: lines[idx].qty + qty };
        return { ...s, lines };
      }
      return {
        merchantId: product.merchant_id,
        lines: [...s.lines, { product, qty, options }],
      };
    });
  },

  remove(productId) {
    set((s) => {
      const lines = s.lines.filter((l) => l.product.id !== productId);
      return { merchantId: lines.length ? s.merchantId : null, lines };
    });
  },

  setQty(productId, qty) {
    if (qty <= 0) return get().remove(productId);
    set((s) => ({
      ...s,
      lines: s.lines.map((l) => (l.product.id === productId ? { ...l, qty } : l)),
    }));
  },

  clear() {
    set({ merchantId: null, lines: [] });
  },

  subtotal() {
    return get().lines.reduce((sum, l) => sum + Number(l.product.price) * l.qty, 0);
  },

  count() {
    return get().lines.reduce((sum, l) => sum + l.qty, 0);
  },
}));
