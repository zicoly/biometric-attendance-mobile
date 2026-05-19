import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

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

// Get user-specific key
const getUserKey = (key: string, userId?: string) => {
  if (userId) {
    return `${userId}_${key}`;
  }
  return key;
};

export const storage = {
  async getItem(key: string, userId?: string): Promise<string | null> {
    const storageKey = getUserKey(key, userId);
    try {
      if (isWeb) {
        return webStorage.getItem(storageKey);
      }
      return await SecureStore.getItemAsync(storageKey);
    } catch (error) {
      console.error("Storage getItem error:", error);
      return null;
    }
  },

  async setItem(key: string, value: string, userId?: string): Promise<void> {
    const storageKey = getUserKey(key, userId);
    try {
      if (isWeb) {
        webStorage.setItem(storageKey, value);
      } else {
        await SecureStore.setItemAsync(storageKey, value);
      }
    } catch (error) {
      console.error("Storage setItem error:", error);
    }
  },

  async removeItem(key: string, userId?: string): Promise<void> {
    const storageKey = getUserKey(key, userId);
    try {
      if (isWeb) {
        webStorage.removeItem(storageKey);
      } else {
        await SecureStore.deleteItemAsync(storageKey);
      }
    } catch (error) {
      console.error("Storage removeItem error:", error);
    }
  },

  async clearUserData(userId: string): Promise<void> {
    await this.removeItem("markedSessions", userId);
    await this.removeItem("deviceId", userId);
    await this.removeItem("privateKey", userId);
  },
};
