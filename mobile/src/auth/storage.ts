/** تخزين آمن للتوكنات عبر expo-secure-store (Keychain على iOS, Keystore على Android) */
import * as SecureStore from "expo-secure-store";

const KEY_ACCESS = "z_access_token";
const KEY_REFRESH = "z_refresh_token";
const KEY_USER = "z_user_info";

export interface StoredUser {
  user_id: string;
  role: string;
}

export const tokenStorage = {
  async save(access: string, refresh: string, user: StoredUser) {
    await SecureStore.setItemAsync(KEY_ACCESS, access);
    await SecureStore.setItemAsync(KEY_REFRESH, refresh);
    await SecureStore.setItemAsync(KEY_USER, JSON.stringify(user));
  },
  async getAccess(): Promise<string | null> {
    return SecureStore.getItemAsync(KEY_ACCESS);
  },
  async getUser(): Promise<StoredUser | null> {
    const raw = await SecureStore.getItemAsync(KEY_USER);
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  },
  async clear() {
    await SecureStore.deleteItemAsync(KEY_ACCESS);
    await SecureStore.deleteItemAsync(KEY_REFRESH);
    await SecureStore.deleteItemAsync(KEY_USER);
  },
};
