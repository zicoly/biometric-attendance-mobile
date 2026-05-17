import { create } from "zustand";
import { authService, User } from "../services/authService";
import * as SecureStore from "expo-secure-store";

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

export const useAuthStore = create<AuthState>((set) => ({
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
      console.log("Store: Login successful", user);
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
    await authService.logout();
    set({ user: null, isAuthenticated: false, error: null });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      let token = null;
      try {
        token = await SecureStore.getItemAsync("accessToken");
        console.log("Check Auth - Token exists:", !!token);
      } catch (error) {
        console.error("Error reading token:", error);
      }

      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const user = await authService.getMe();
      console.log("Check Auth - User found:", user?.fullName);
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error("Check Auth failed:", error);
      try {
        await SecureStore.deleteItemAsync("accessToken");
      } catch (deleteError) {
        console.error("Failed to delete token:", deleteError);
      }
      set({ isLoading: false, isAuthenticated: false, user: null });
    }
  },

  // In authStore.ts, add a method to check token validity
  checkTokenValidity: async () => {
    try {
      const token = await authService.getToken();
      if (!token) return false;

      // Decode token to check expiration
      const payload = JSON.parse(atob(token.split(".")[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        console.log("Token expired, logging out");
        await authService.logout();
        set({ user: null, isAuthenticated: false });
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },
}));
