import { api } from "./client";
import type { UserRole } from "./types";

export interface Profile {
  id: string;
  name: string | null;
  phone: string;
  role: UserRole;
  avatar_url: string | null;
}

export interface ProfileUpdate {
  name?: string | null;
  avatar_url?: string | null;
}

export const meApi = {
  profile: () => api.get<Profile>("/me/profile"),
  updateProfile: (payload: ProfileUpdate) => api.patch<Profile>("/me/profile", payload),
};
