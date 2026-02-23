import Constants from "expo-constants";

const getApiUrl = (): string => {
  if (__DEV__) {
    return "https://api.appsentynela.com.br";
  }
  return "https://api.appsentynela.com.br";
};

const API_URL = getApiUrl();

export { API_URL };

export const ENV = {
  API_URL,
  API_V1: `${API_URL}/api/v1`,
} as const;
