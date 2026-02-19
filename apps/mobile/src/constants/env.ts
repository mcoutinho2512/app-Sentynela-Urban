import Constants from "expo-constants";

const getApiUrl = (): string => {
  if (__DEV__) {
    return "http://69.6.250.114";
  }
  return "http://69.6.250.114";
};

const API_URL = getApiUrl();

export { API_URL };

export const ENV = {
  API_URL,
  API_V1: `${API_URL}/api/v1`,
} as const;
