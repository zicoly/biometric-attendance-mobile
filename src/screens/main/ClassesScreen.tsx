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
import { useNavigation } from "@react-navigation/native";
import { studentService, Session } from "../../services/studentService";
import { useBiometric } from "../../hooks/useBiometric";
import { useAttendanceStore } from "../../store/attendanceStore";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { storage } from "../../utils/storage";
import { useAuthStore } from "../../store/authStore";

export const ClassesScreen = () => {
  const navigation = useNavigation();
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
  const [scannerVisible, setScannerVisible] = useState(false);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [markedSessions, setMarkedSessions] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { markAttendanceWithBiometric, checkDeviceRegistration } =
    useBiometric();
  const { addToQueue, syncQueue } = useAttendanceStore();
  const { user } = useAuthStore();

  // Load marked sessions from storage
  const loadMarkedSessions = async () => {
    try {
      const stored = await storage.getItem("markedSessions", user?._id);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMarkedSessions(new Set(parsed));
        return new Set(parsed);
      }
      return new Set<string>();
    } catch (error) {
      console.error("Failed to load marked sessions:", error);
      return new Set<string>();
    }
  };

  // Save marked session
  const saveMarkedSession = async (sessionId: string) => {
    try {
      const newMarked = new Set(markedSessions);
      newMarked.add(sessionId);
      setMarkedSessions(newMarked);
      await storage.setItem(
        "markedSessions",
        JSON.stringify([...newMarked]),
        user?._id,
      );
    } catch (error) {
      console.error("Failed to save marked session:", error);
    }
  };

  const loadSessions = useCallback(async () => {
    try {
      const [active, upcoming] = await Promise.all([
        studentService.getActiveSessions(),
        studentService.getUpcomingSessions(),
      ]);

      // Load marked sessions from storage
      const markedSet = await loadMarkedSessions();

      const activeWithMarked = active.map((session) => ({
        ...session,
        hasMarked: markedSet.has(session._id),
      }));

      const upcomingWithMarked = upcoming.map((session) => ({
        ...session,
        hasMarked: markedSet.has(session._id),
      }));

      setActiveSessions(activeWithMarked);
      setUpcomingSessions(upcomingWithMarked);
    } catch (error) {
      console.error("Failed to load sessions:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const validateSession = async (session: Session): Promise<boolean> => {
    try {
      const result = await studentService.validateSession(session._id);

      if (result.status === "success") {
        return true;
      }

      Alert.alert("Cannot Mark Attendance", result.message || "Unknown error");
      return false;
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
    if (markedSessions.has(session._id)) {
      Alert.alert(
        "Info",
        "You have already marked attendance for this session",
      );
      return;
    }

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
        { text: "Scan QR Code", onPress: () => openQRScanner(session) },
      ],
    );
  };

  const openQRScanner = async (session: Session) => {
    setSelectedSession(session);

    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          "Camera Permission Required",
          "Camera access is needed to scan QR codes. You can also enter the token manually.",
          [
            { text: "Enter Manually", onPress: () => setQrModalVisible(true) },
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => setSelectedSession(null),
            },
          ],
        );
        return;
      }
    }

    setScannerVisible(true);
  };

  const handleBarCodeScanned = async (result: any) => {
    if (!result?.data || isSubmitting) return;

    const scannedToken = result.data;
    console.log("📱 QR Code scanned:", scannedToken);
    setScannerVisible(false);

    await submitAttendance(scannedToken);
  };

  const submitAttendance = async (token: string) => {
    if (!token.trim()) {
      Alert.alert("Error", "Invalid QR code");
      return;
    }

    if (!selectedSession) {
      Alert.alert("Error", "No session selected");
      return;
    }

    setIsSubmitting(true);
    setMarkingMethod("qr");

    try {
      const location = await getLocation();
      await studentService.markQRAttendance(
        token,
        new Date().toISOString(),
        location,
      );

      Alert.alert("Success", "Attendance marked successfully!");

      // Save to local storage
      await saveMarkedSession(selectedSession._id);

      // Update UI immediately
      setActiveSessions((prev) =>
        prev.map((s) =>
          s._id === selectedSession._id ? { ...s, hasMarked: true } : s,
        ),
      );

      setQrToken("");
      setQrModalVisible(false);
      setSelectedSession(null);
    } catch (error: any) {
      console.error("Marking failed:", error);
      if (
        error.response?.status === 400 &&
        error.response?.data?.message?.includes("already")
      ) {
        Alert.alert(
          "Info",
          "You have already marked attendance for this session",
        );
        await saveMarkedSession(selectedSession._id);
        setActiveSessions((prev) =>
          prev.map((s) =>
            s._id === selectedSession._id ? { ...s, hasMarked: true } : s,
          ),
        );
      } else {
        Alert.alert(
          "Failed",
          error.response?.data?.message || "Failed to mark attendance",
        );
      }
    } finally {
      setIsSubmitting(false);
      setMarkingMethod(null);
    }
  };

  const markWithBiometric = async (session: Session) => {
    const registered = await checkDeviceRegistration();
    if (!registered) {
      Alert.alert(
        "Biometric Not Setup",
        "Please setup biometric authentication in Profile",
        [
          {
            text: "Later",
            style: "cancel",
            onPress: () => setSelectedSession(null),
          },
          {
            text: "Go to Profile",
            onPress: () => {
              setSelectedSession(null);
              navigation.navigate("Profile" as never);
            },
          },
        ],
      );
      return;
    }

    setIsSubmitting(true);
    setMarkingMethod("biometric");

    try {
      const location = await getLocation();
      const result = await markAttendanceWithBiometric(session._id, location);

      if (result.success) {
        Alert.alert("Success", "Attendance marked successfully!");
        await saveMarkedSession(session._id);
        setActiveSessions((prev) =>
          prev.map((s) =>
            s._id === session._id ? { ...s, hasMarked: true } : s,
          ),
        );
      } else {
        if (result.error?.toLowerCase().includes("expired")) {
          Alert.alert(
            "Session Expired",
            "The biometric challenge expired. Please try marking attendance again.",
            [{ text: "Try Again", onPress: () => markWithBiometric(session) }],
          );
        } else if (result.error?.toLowerCase().includes("already")) {
          Alert.alert(
            "Info",
            "You have already marked attendance for this session",
          );
          await saveMarkedSession(session._id);
          setActiveSessions((prev) =>
            prev.map((s) =>
              s._id === session._id ? { ...s, hasMarked: true } : s,
            ),
          );
        } else {
          Alert.alert("Failed", result.error || "Could not mark attendance");
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to mark attendance");
    } finally {
      setIsSubmitting(false);
      setMarkingMethod(null);
      setSelectedSession(null);
    }
  };

  const markWithQRManual = async () => {
    await submitAttendance(qrToken);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    };
    return date.toLocaleDateString(undefined, options);
  };

  const formatTimeRange = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const getRemainingTime = (endTime: string) => {
    const now = new Date();
    const end = new Date(endTime);
    const diff = Math.max(
      0,
      Math.floor((end.getTime() - now.getTime()) / 60000),
    );
    if (diff <= 0) return "Ending soon";
    if (diff < 60) return `${diff} min remaining`;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return `${hours}h ${mins}m remaining`;
  };

  const renderSessionCard = ({ item }: { item: Session }) => {
    const isLive = item.status === "live";
    const isUpcoming = item.status === "upcoming";
    const hasMarked = item.hasMarked === true;
    const remainingTime = isLive ? getRemainingTime(item.endTime) : null;

    return (
      <View style={[styles.sessionCard, hasMarked && styles.sessionCardMarked]}>
        <View style={styles.sessionHeader}>
          <Text style={styles.courseCode}>{item.courseCode}</Text>
          <View
            style={[
              styles.statusBadge,
              isLive ? styles.statusActive : styles.statusScheduled,
            ]}
          >
            <Text style={styles.statusText}>
              {isLive ? "LIVE" : "UPCOMING"}
            </Text>
          </View>
        </View>

        <Text style={styles.courseTitle}>{item.courseTitle}</Text>

        <View style={styles.dateTimeContainer}>
          <Ionicons name="calendar-outline" size={14} color="#64748b" />
          <Text style={styles.dateTimeText}>
            {formatDateTime(item.startTime)}
          </Text>
        </View>

        <View style={styles.dateTimeContainer}>
          <Ionicons name="time-outline" size={14} color="#64748b" />
          <Text style={styles.dateTimeText}>
            {formatTimeRange(item.startTime, item.endTime)}
          </Text>
        </View>

        {isLive && remainingTime && (
          <View style={styles.remainingContainer}>
            <Ionicons name="timer-outline" size={14} color="#22c55e" />
            <Text style={styles.remainingText}>{remainingTime}</Text>
          </View>
        )}

        {/* If marked, show "Already Marked" badge - No button */}
        {isLive && hasMarked && (
          <View style={styles.markedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.markedText}>Already Marked ✓</Text>
          </View>
        )}

        {/* If not marked and live, show Mark Attendance button */}
        {isLive && !hasMarked && (
          <TouchableOpacity
            style={styles.markButton}
            onPress={() => handleMarkAttendance(item)}
            disabled={isSubmitting}
          >
            <Ionicons name="finger-print-outline" size={16} color="#fff" />
            <Text style={styles.markButtonText}>Mark Attendance</Text>
          </TouchableOpacity>
        )}

        {isUpcoming && !hasMarked && (
          <View style={styles.upcomingInfo}>
            <Ionicons name="time-outline" size={14} color="#3b82f6" />
            <Text style={styles.upcomingText}>
              Starts at{" "}
              {new Date(item.startTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        )}
      </View>
    );
  };

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
        <Ionicons name="calendar-outline" size={64} color="#cbd5e1" />
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

      {/* Loading Overlay */}
      {isSubmitting && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingTitle}>
              {markingMethod === "biometric"
                ? "Processing Biometric..."
                : "Submitting Attendance..."}
            </Text>
            <Text style={styles.loadingSubtitle}>
              {markingMethod === "biometric"
                ? "Please wait while we verify your fingerprint/face ID"
                : "Please wait while we record your attendance"}
            </Text>
          </View>
        </View>
      )}

      {/* QR Scanner Modal - Improved Design */}
      <Modal visible={scannerVisible} transparent={false} animationType="slide">
        <View style={styles.scannerContainer}>
          <View style={styles.scannerHeader}>
            <TouchableOpacity
              onPress={() => setScannerVisible(false)}
              style={styles.scannerBackButton}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.scannerTitle}>Scan QR Code</Text>
            <View style={{ width: 40 }} />
          </View>

          <CameraView
            style={styles.scanner}
            onBarcodeScanned={handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: ["qr"],
            }}
          >
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
              <Text style={styles.scannerInstruction}>
                Align QR code within the frame
              </Text>
              <TouchableOpacity
                style={styles.manualEntryButton}
                onPress={() => {
                  setScannerVisible(false);
                  setQrModalVisible(true);
                }}
              >
                <Ionicons name="create-outline" size={16} color="#2563eb" />
                <Text style={styles.manualEntryText}>Enter Token Manually</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      </Modal>

      {/* Manual QR Token Modal (Fallback) */}
      <Modal visible={qrModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter QR Token</Text>
            <Text style={styles.modalSubtitle}>
              Enter the QR token displayed on your lecturer's screen
            </Text>
            <TextInput
              style={styles.qrInput}
              placeholder="Paste or type QR token here"
              value={qrToken}
              onChangeText={setQrToken}
              autoCapitalize="none"
              multiline
              editable={!isSubmitting}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setQrModalVisible(false);
                  setQrToken("");
                  setSelectedSession(null);
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={markWithQRManual}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text
                    style={[
                      styles.modalButtonText,
                      styles.modalButtonConfirmText,
                    ]}
                  >
                    Submit
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  sessionCardMarked: {
    backgroundColor: "#f0fdf4",
    borderWidth: 1,
    borderColor: "#22c55e",
  },

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
    marginBottom: 12,
  },

  dateTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  dateTimeText: { fontSize: 12, color: "#64748b" },

  remainingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 12,
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  remainingText: { fontSize: 11, color: "#22c55e", fontWeight: "500" },

  markButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  markButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  markedBadge: {
    backgroundColor: "#22c55e",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  markedText: { color: "#fff", fontWeight: "600", fontSize: 14 },

  upcomingInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  upcomingText: { fontSize: 12, color: "#3b82f6", fontWeight: "500" },

  emptyState: {
    alignItems: "center",
    padding: 40,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
  },
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

  scannerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  scannerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  scannerBackButton: {
    padding: 8,
  },
  scannerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  scanner: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  scannerFrame: {
    width: 280,
    height: 280,
    borderWidth: 2,
    borderColor: "#2563eb",
    borderRadius: 20,
    backgroundColor: "transparent",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  scannerInstruction: {
    color: "#fff",
    marginTop: 30,
    fontSize: 14,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  manualEntryButton: {
    position: "absolute",
    bottom: 50,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 12,
  },
  manualEntryText: {
    color: "#2563eb",
    fontSize: 14,
    fontWeight: "600",
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
    minHeight: 80,
    textAlignVertical: "top",
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
    zIndex: 1000,
  },
  loadingCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    width: "80%",
    maxWidth: 280,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 16,
    marginBottom: 8,
  },
  loadingSubtitle: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },
});
