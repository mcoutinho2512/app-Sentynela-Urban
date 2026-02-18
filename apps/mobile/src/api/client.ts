import axios from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "@/utils/tokenStorage";
import { ENV } from "@/constants/env";

export const apiClient = axios.create({
  baseURL: ENV.API_V1,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = await getRefreshToken();

      if (refreshToken) {
        try {
          const { data } = await axios.post(`${ENV.API_V1}/auth/refresh`, {
            refresh_token: refreshToken,
          });
          await setTokens(data.access_token, data.refresh_token);
          originalRequest.headers.Authorization = `Bearer ${data.access_token}`;
          return apiClient(originalRequest);
        } catch {
          await clearTokens();
        }
      }
    }

    return Promise.reject(error);
  }
);
