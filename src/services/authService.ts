import { api } from "./api";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const isWeb = Platform.OS === "web";

const webStorage = {
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
};

export interface User {
  _id: string;
  fullName: string;
  matricNumber: string;
  email: string;
  role: string;
  department: string;
  level: number;
}

// Helper to unwrap API response
const unwrap = (raw: any) => raw?.data ?? raw;

export const authService = {
  async login(
    emailOrMatric: string,
    password: string,
  ): Promise<{ user: User; accessToken: string }> {
    console.log("Attempting login with:", emailOrMatric);

    const response = await api.post("/auth/login", { emailOrMatric, password });
    console.log("Login response:", response.data);

    const data = unwrap(response.data);
    const user = data.user;
    const accessToken = data.tokens?.accessToken;
    const refreshToken = data.tokens?.refreshToken;

    console.log("User data from login:", {
      fullName: user?.fullName,
      department: user?.department,
      level: user?.level,
    });

    if (accessToken) {
      if (isWeb) {
        webStorage.setItem("accessToken", accessToken);
        if (refreshToken) webStorage.setItem("refreshToken", refreshToken);
      } else {
        await SecureStore.setItemAsync("accessToken", accessToken);
        if (refreshToken)
          await SecureStore.setItemAsync("refreshToken", refreshToken);
      }
      console.log("✅ Tokens saved");
    }

    return { user, accessToken };
  },

  async getMe(): Promise<User> {
    const response = await api.get("/auth/me");
    const data = unwrap(response.data);
    const user = data.user || data; // Handle both { user: {...} } and direct user object
    console.log("getMe response - user:", {
      fullName: user?.fullName,
      department: user?.department,
      level: user?.level,
    });
    return user;
  },

  async getToken(): Promise<string | null> {
    if (isWeb) {
      return webStorage.getItem("accessToken");
    }
    return await SecureStore.getItemAsync("accessToken");
  },

  async logout(): Promise<void> {
    if (isWeb) {
      webStorage.removeItem("accessToken");
      webStorage.removeItem("refreshToken");
    } else {
      await SecureStore.deleteItemAsync("accessToken");
      await SecureStore.deleteItemAsync("refreshToken");
    }
  },
};
