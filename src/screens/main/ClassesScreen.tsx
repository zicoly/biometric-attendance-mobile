import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { studentService, Session } from "../../services/studentService";
import { useBiometric } from "../../hooks/useBiometric";
import { useAttendanceStore } from "../../store/attendanceStore";
import * as Location from "expo-location";

export const ClassesScreen = () => {
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [qrToken, setQrToken] = useState("");
  const [markingMethod, setMarkingMethod] = useState<"biometric" | "qr" | null>(
    null,
  );

  const { markAttendanceWithBiometric, checkDeviceRegistration } =
    useBiometric();
  const { addToQueue, syncQueue } = useAttendanceStore();

  const loadSessions = useCallback(async () => {
    try {
      const [active, upcoming] = await Promise.all([
        studentService.getActiveSessions(),
        studentService.getUpcomingSessions(),
      ]);
      setActiveSessions(active);
      setUpcomingSessions(upcoming);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const validateSession = async (session: Session): Promise<boolean> => {
    try {
      const result = await studentService.validateSession(session._id);
      if (!result.canMark) {
        Alert.alert("Cannot Mark Attendance", result.message);
        return false;
      }
      return true;
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Validation failed",
      );
      return false;
    }
  };

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return undefined;
      const location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch {
      return undefined;
    }
  };

  const handleMarkAttendance = async (session: Session) => {
    const isValid = await validateSession(session);
    if (!isValid) return;

    setSelectedSession(session);
    Alert.alert(
      "Mark Attendance",
      `Mark attendance for ${session.courseCode}: ${session.courseTitle}`,
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => setSelectedSession(null),
        },
        { text: "Use Biometric", onPress: () => markWithBiometric(session) },
        { text: "Use QR Code", onPress: () => setQrModalVisible(true) },
      ],
    );
  };

  const markWithBiometric = async (session: Session) => {
    const registered = await checkDeviceRegistration();
    if (!registered) {
      Alert.alert(
        "Biometric Not Setup",
        "Please setup biometric authentication in Profile",
      );
      setSelectedSession(null);
      return;
    }

    setMarkingMethod("biometric");
    try {
      const location = await getLocation();
      const result = await markAttendanceWithBiometric(session._id, location);
      if (result.success) {
        Alert.alert("Success", "Attendance marked successfully!");
        loadSessions();
      } else {
        Alert.alert("Failed", result.error || "Could not mark attendance");
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to mark attendance");
    } finally {
      setMarkingMethod(null);
      setSelectedSession(null);
    }
  };

  const markWithQR = async () => {
    if (!qrToken.trim()) {
      Alert.alert("Error", "Please enter the QR token");
      return;
    }

    setMarkingMethod("qr");
    try {
      const location = await getLocation();
      await studentService.markQRAttendance(
        qrToken,
        new Date().toISOString(),
        location,
      );
      Alert.alert("Success", "Attendance marked successfully!");
      loadSessions();
      setQrToken("");
      setQrModalVisible(false);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to mark attendance",
      );
    } finally {
      setMarkingMethod(null);
      setSelectedSession(null);
    }
  };

  const renderSessionCard = ({ item }: { item: Session }) => (
    <TouchableOpacity
      style={[styles.sessionCard, item.hasMarked && styles.sessionCardMarked]}
      onPress={() => !item.hasMarked && handleMarkAttendance(item)}
      disabled={item.hasMarked}
    >
      <View style={styles.sessionHeader}>
        <Text style={styles.courseCode}>{item.courseCode}</Text>
        <View
          style={[
            styles.statusBadge,
            item.status === "active"
              ? styles.statusActive
              : styles.statusScheduled,
          ]}
        >
          <Text style={styles.statusText}>
            {item.status === "active" ? "LIVE" : "UPCOMING"}
          </Text>
        </View>
      </View>
      <Text style={styles.courseTitle}>{item.courseTitle}</Text>
      <View style={styles.timeContainer}>
        <Text style={styles.timeLabel}>Time:</Text>
        <Text style={styles.timeValue}>
          {new Date(item.startTime).toLocaleTimeString()} -{" "}
          {new Date(item.endTime).toLocaleTimeString()}
        </Text>
      </View>
      {item.hasMarked ? (
        <View style={styles.markedBadge}>
          <Text style={styles.markedText}>✓ Already Marked</Text>
        </View>
      ) : (
        <View style={styles.markButton}>
          <Text style={styles.markButtonText}>Mark Attendance</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderUpcomingSessions = () => {
    if (upcomingSessions.length === 0) return null;

    return (
      <>
        <Text style={styles.upcomingTitle}>Upcoming Sessions</Text>
        {upcomingSessions.map((session) => (
          <View key={session._id}>{renderSessionCard({ item: session })}</View>
        ))}
      </>
    );
  };

  const renderEmptyHeader = () => {
    if (activeSessions.length > 0) return null;

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyEmoji}>📭</Text>
        <Text style={styles.emptyTitle}>No Active Sessions</Text>
        <Text style={styles.emptyText}>
          There are no live sessions right now. Check back during your class
          time.
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={activeSessions}
        keyExtractor={(item) => item._id}
        renderItem={renderSessionCard}
        ListHeaderComponent={renderEmptyHeader()}
        ListFooterComponent={renderUpcomingSessions()}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2563eb"]}
          />
        }
        contentContainerStyle={styles.listContent}
      />

      {/* QR Modal */}
      <Modal visible={qrModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Scan QR Code</Text>
            <Text style={styles.modalSubtitle}>
              Enter the QR token from your lecturer's screen
            </Text>
            <TextInput
              style={styles.qrInput}
              placeholder="Enter QR token"
              value={qrToken}
              onChangeText={setQrToken}
              autoCapitalize="none"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setQrModalVisible(false);
                  setQrToken("");
                  setSelectedSession(null);
                }}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={markWithQR}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    styles.modalButtonConfirmText,
                  ]}
                >
                  Submit
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Loading Overlay */}
      {markingMethod === "biometric" && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>
            Processing biometric authentication...
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, flexGrow: 1 },
  sessionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sessionCardMarked: { backgroundColor: "#f0fdf4", opacity: 0.7 },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  courseCode: { fontSize: 16, fontWeight: "bold", color: "#2563eb" },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusActive: { backgroundColor: "#dcfce7" },
  statusScheduled: { backgroundColor: "#fef3c7" },
  statusText: { fontSize: 10, fontWeight: "600" },
  courseTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  timeContainer: { flexDirection: "row", marginBottom: 12 },
  timeLabel: { fontSize: 12, color: "#64748b", width: 40 },
  timeValue: { fontSize: 12, color: "#334155", flex: 1 },
  markButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  markButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  markedBadge: {
    backgroundColor: "#22c55e",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  markedText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, color: "#64748b", textAlign: "center" },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 20,
    textAlign: "center",
  },
  qrInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 20,
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalButtonCancel: { backgroundColor: "#f1f5f9" },
  modalButtonConfirm: { backgroundColor: "#2563eb" },
  modalButtonText: { fontSize: 14, fontWeight: "600", color: "#334155" },
  modalButtonConfirmText: { color: "#fff" },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { marginTop: 16, color: "#fff", fontSize: 14 },
});
