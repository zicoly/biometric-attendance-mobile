import { create } from "zustand";
import { authService, User } from "../services/authService";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { storage } from "../utils/storage";

const isWeb = Platform.OS === "web";

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

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (emailOrMatric: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,

  clearError: () => set({ error: null }),

  login: async (emailOrMatric, password) => {
    set({ isLoading: true, error: null });
    try {
      console.log("Store: Logging in...");
      const { user } = await authService.login(emailOrMatric, password);
      console.log("Store: Login successful - User details:", {
        fullName: user?.fullName,
        department: user?.department,
        level: user?.level,
      });
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error: any) {
      console.error("Store: Login failed", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Login failed";
      set({
        error: errorMessage,
        isLoading: false,
        isAuthenticated: false,
        user: null,
      });
      throw error;
    }
  },

  logout: async () => {
    const currentUser = get().user;

    // Clear auth tokens
    await authService.logout();

    set({ user: null, isAuthenticated: false, error: null });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      let token = null;
      try {
        if (isWeb) {
          token = webStorage.getItem("accessToken");
        } else {
          token = await SecureStore.getItemAsync("accessToken");
        }
        console.log("Check Auth - Token exists:", !!token);
      } catch (error) {
        console.error("Error reading token:", error);
      }

      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const user = await authService.getMe();
      console.log("Check Auth - User found:", {
        fullName: user?.fullName,
        department: user?.department,
        level: user?.level,
      });
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error("Check Auth failed:", error);
      try {
        if (isWeb) {
          webStorage.removeItem("accessToken");
          webStorage.removeItem("refreshToken");
        } else {
          await SecureStore.deleteItemAsync("accessToken");
          await SecureStore.deleteItemAsync("refreshToken");
        }
      } catch (deleteError) {
        console.error("Failed to delete token:", deleteError);
      }
      set({ isLoading: false, isAuthenticated: false, user: null });
    }
  },
}));
