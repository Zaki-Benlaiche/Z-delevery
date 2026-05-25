/** تخزين التوكنات في localStorage (للويب) */
const KEY_ACCESS = "z_access_token";
const KEY_USER = "z_user_info";

export interface StoredUser {
  user_id: string;
  role: string;
}

export const tokenStorage = {
  save(access: string, user: StoredUser) {
    localStorage.setItem(KEY_ACCESS, access);
    localStorage.setItem(KEY_USER, JSON.stringify(user));
  },
  getAccess(): string | null {
    return localStorage.getItem(KEY_ACCESS);
  },
  getUser(): StoredUser | null {
    const raw = localStorage.getItem(KEY_USER);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  },
  clear() {
    localStorage.removeItem(KEY_ACCESS);
    localStorage.removeItem(KEY_USER);
  },
};
