import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { studentService } from "../services/studentService";

interface OfflineRecord {
  id: string;
  sessionId: string;
  timestamp: string;
  deviceId: string;
  status: "pending" | "synced";
}

interface AttendanceState {
  offlineQueue: OfflineRecord[];
  addToQueue: (record: Omit<OfflineRecord, "id" | "status">) => Promise<void>;
  syncQueue: () => Promise<void>;
  loadQueue: () => Promise<void>;
}

export const useAttendanceStore = create<AttendanceState>((set, get) => ({
  offlineQueue: [],

  addToQueue: async (record) => {
    const newRecord: OfflineRecord = {
      ...record,
      id: `offline_${Date.now()}`,
      status: "pending",
    };
    const updatedQueue = [...get().offlineQueue, newRecord];
    await AsyncStorage.setItem("offlineQueue", JSON.stringify(updatedQueue));
    set({ offlineQueue: updatedQueue });
  },

  syncQueue: async () => {
    const { offlineQueue } = get();
    const pendingRecords = offlineQueue.filter((r) => r.status === "pending");
    if (pendingRecords.length === 0) return;

    try {
      await studentService.syncOfflineRecords(pendingRecords);
      const syncedQueue = offlineQueue.filter(
        (r) => !pendingRecords.includes(r),
      );
      await AsyncStorage.setItem("offlineQueue", JSON.stringify(syncedQueue));
      set({ offlineQueue: syncedQueue });
    } catch (error) {
      console.error("Sync failed:", error);
    }
  },

  loadQueue: async () => {
    const queue = await AsyncStorage.getItem("offlineQueue");
    set({ offlineQueue: queue ? JSON.parse(queue) : [] });
  },
}));
