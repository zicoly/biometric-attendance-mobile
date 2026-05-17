import axios from "axios";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const API_URL = "https://awwal-ams-backend.vercel.app/api";

// Web fallback for storage
const webStorage = {
  getItem: (key: string) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Ignore
    }
  },
  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Ignore
    }
  },
};

const isWeb = Platform.OS === "web";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  try {
    let token = null;
    if (isWeb) {
      token = webStorage.getItem("accessToken");
    } else {
      token = await SecureStore.getItemAsync("accessToken");
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(
        `🔐 [API] Request with token: ${config.method?.toUpperCase()} ${config.url}`,
      );
    } else {
      console.log(
        `🔓 [API] No token: ${config.method?.toUpperCase()} ${config.url}`,
      );
    }
    return config;
  } catch (error) {
    console.error("API interceptor error:", error);
    return config;
  }
});

// Handle 401 responses - token expired
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      console.log("🔄 Token expired, attempting to refresh...");

      try {
        // Try to refresh the token
        let refreshToken = null;
        if (isWeb) {
          refreshToken = webStorage.getItem("refreshToken");
        } else {
          refreshToken = await SecureStore.getItemAsync("refreshToken");
        }

        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const newAccessToken = response.data?.data?.tokens?.accessToken;

          if (newAccessToken) {
            // Save new token
            if (isWeb) {
              webStorage.setItem("accessToken", newAccessToken);
            } else {
              await SecureStore.setItemAsync("accessToken", newAccessToken);
            }

            // Retry original request
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        }

        // If no refresh token or refresh failed, logout
        console.log("❌ Refresh failed, logging out...");
        if (isWeb) {
          webStorage.removeItem("accessToken");
          webStorage.removeItem("refreshToken");
        } else {
          await SecureStore.deleteItemAsync("accessToken");
          await SecureStore.deleteItemAsync("refreshToken");
        }

        // Navigate to login (you might need to emit an event)
        // For now, just reject
        return Promise.reject(error);
      } catch (refreshError) {
        console.error("Refresh error:", refreshError);
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);
