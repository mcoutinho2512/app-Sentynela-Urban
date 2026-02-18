import Constants from "expo-constants";

const getApiUrl = (): string => {
  if (__DEV__) {
    return "http://10.50.30.244:8001";
  }
  return "https://api.urbanassistant.com";
};

const API_URL = getApiUrl();

export { API_URL };

export const ENV = {
  API_URL,
  API_V1: `${API_URL}/api/v1`,
} as const;
