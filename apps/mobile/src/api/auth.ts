import { apiClient } from "./client";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface UserResponse {
  id: number;
  email: string;
  name: string;
  avatar_url: string | null;
  role: string;
  reputation: number;
  created_at: string;
}

export const authApi = {
  register: (email: string, password: string, name: string) =>
    apiClient.post<TokenResponse>("/auth/register", { email, password, name }).then((r) => r.data),

  login: (email: string, password: string) =>
    apiClient.post<TokenResponse>("/auth/login", { email, password }).then((r) => r.data),

  getMe: () => apiClient.get<UserResponse>("/auth/me").then((r) => r.data),
};
