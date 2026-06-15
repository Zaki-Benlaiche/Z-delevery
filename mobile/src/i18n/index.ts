/** نظام اللغة — مخزن + خطّاف ترجمة (عربي/فرنسي) محفوظ محليّاً */
import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

import { dictionaries, type Lang } from "./translations";

export type { Lang } from "./translations";
export { LANGS } from "./translations";

const KEY_LANG = "z_language";

interface LangState {
  lang: Lang;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setLang: (l: Lang) => void;
}

export const useLanguage = create<LangState>((set) => ({
  lang: "ar",
  hydrated: false,

  async hydrate() {
    try {
      const raw = await SecureStore.getItemAsync(KEY_LANG);
      set({ lang: raw === "fr" ? "fr" : "ar", hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  setLang(l) {
    set({ lang: l });
    SecureStore.setItemAsync(KEY_LANG, l).catch(() => {});
  },
}));

/** خطّاف الترجمة — يُعيد العرض عند تبديل اللغة */
export function useT() {
  const lang = useLanguage((s) => s.lang);
  const setLang = useLanguage((s) => s.setLang);
  const dict = dictionaries[lang];
  const t = (key: string): string => dict[key] ?? dictionaries.ar[key] ?? key;
  return { t, lang, setLang };
}
