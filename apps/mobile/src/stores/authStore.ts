import { create } from "zustand";
import { authApi, UserResponse } from "@/api/auth";
import { apiClient } from "@/api/client";
import { setTokens, clearTokens, getAccessToken } from "@/utils/tokenStorage";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserResponse | null;
  loadTokens: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: Partial<Pick<UserResponse, "name" | "avatar_url">>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,

  loadTokens: async () => {
    try {
      const token = await getAccessToken();
      if (token) {
        const user = await authApi.getMe();
        set({ isAuthenticated: true, user, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      await clearTokens();
      set({ isAuthenticated: false, user: null, isLoading: false });
    }
  },

  login: async (email, password) => {
    const tokens = await authApi.login(email, password);
    await setTokens(tokens.access_token, tokens.refresh_token);
    const user = await authApi.getMe();
    set({ isAuthenticated: true, user });
  },

  register: async (email, password, name) => {
    const tokens = await authApi.register(email, password, name);
    await setTokens(tokens.access_token, tokens.refresh_token);
    const user = await authApi.getMe();
    set({ isAuthenticated: true, user });
  },

  logout: async () => {
    await clearTokens();
    set({ isAuthenticated: false, user: null });
  },

  updateUser: async (data) => {
    const res = await apiClient.patch<UserResponse>("/users/me", data);
    set({ user: res.data });
  },
}));
