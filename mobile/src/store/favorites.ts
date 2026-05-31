/** مخزن المفضّلة — معرّفات المتاجر المفضّلة، تُحفظ محليّاً على الجهاز عبر SecureStore */
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

const KEY_FAVORITES = "z_favorite_merchants";

interface FavoritesState {
  ids: string[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  toggle: (merchantId: string) => void;
  has: (merchantId: string) => boolean;
}

async function persist(ids: string[]) {
  try {
    await SecureStore.setItemAsync(KEY_FAVORITES, JSON.stringify(ids));
  } catch {
    // تجاهل أخطاء التخزين — المفضّلة تبقى في الذاكرة على الأقلّ
  }
}

export const useFavorites = create<FavoritesState>((set, get) => ({
  ids: [],
  hydrated: false,

  async hydrate() {
    try {
      const raw = await SecureStore.getItemAsync(KEY_FAVORITES);
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      set({ ids, hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  toggle(merchantId) {
    set((s) => {
      const ids = s.ids.includes(merchantId)
        ? s.ids.filter((id) => id !== merchantId)
        : [merchantId, ...s.ids];
      void persist(ids);
      return { ids };
    });
  },

  has(merchantId) {
    return get().ids.includes(merchantId);
  },
}));
