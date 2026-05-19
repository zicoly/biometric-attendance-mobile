import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useBiometric } from "../../hooks/useBiometric";
import { storage } from "../../utils/storage";

export const ProfileScreen = () => {
  const navigation = useNavigation();
  const { user, logout } = useAuthStore();
  const { checkDeviceRegistration, isLoading } = useBiometric();
  const [biometricStatus, setBiometricStatus] = useState<
    "registered" | "not_registered" | "checking"
  >("checking");

  useEffect(() => {
    console.log("ProfileScreen - User object:", user);
  }, [user]);

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    try {
      // Check if device is registered for this user
      const deviceId = await storage.getItem("deviceId", user?._id);
      setBiometricStatus(deviceId ? "registered" : "not_registered");
    } catch (error) {
      console.error("Error checking biometric status:", error);
      setBiometricStatus("not_registered");
    }
  };

  const handleBiometricSetup = () => {
    if (biometricStatus === "registered") {
      Alert.alert(
        "Already Setup",
        "Biometric authentication is already configured",
      );
      return;
    }

    // Navigate to the biometric setup screen
    navigation.navigate("BiometricSetup" as never);
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.fullName?.charAt(0) || "S"}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.fullName || "Student"}</Text>
        <Text style={styles.userDetail}>{user?.matricNumber}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Information</Text>

        <View style={styles.infoCard}>
          <Ionicons name="mail-outline" size={20} color="#64748b" />
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{user?.email || "Not available"}</Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="business-outline" size={20} color="#64748b" />
          <Text style={styles.label}>Department</Text>
          <Text style={styles.value}>
            {user?.department || "Not available"}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="trending-up-outline" size={20} color="#64748b" />
          <Text style={styles.label}>Level</Text>
          <Text style={styles.value}>
            {user?.level ? user.level.toString() : "Not available"}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>

        <TouchableOpacity
          style={styles.biometricCard}
          onPress={handleBiometricSetup}
          disabled={isLoading}
        >
          <View style={styles.biometricLeft}>
            <Ionicons
              name={
                biometricStatus === "registered"
                  ? "finger-print"
                  : "finger-print-outline"
              }
              size={24}
              color={biometricStatus === "registered" ? "#22c55e" : "#64748b"}
            />
            <View>
              <Text style={styles.biometricTitle}>
                Biometric Authentication
              </Text>
              <Text style={styles.biometricSubtitle}>
                {biometricStatus === "registered"
                  ? "Fingerprint/Face ID is enabled"
                  : "Set up fingerprint or Face ID for faster attendance"}
              </Text>
            </View>
          </View>
          {isLoading ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <Ionicons
              name={
                biometricStatus === "registered"
                  ? "checkmark-circle"
                  : "chevron-forward"
              }
              size={20}
              color={biometricStatus === "registered" ? "#22c55e" : "#cbd5e1"}
            />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#fff" />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    backgroundColor: "#2563eb",
    padding: 24,
    paddingTop: 48,
    paddingBottom: 32,
    alignItems: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarText: { fontSize: 32, fontWeight: "bold", color: "#2563eb" },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  userDetail: { fontSize: 14, color: "#bfdbfe" },
  section: { padding: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 6,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
  },
  label: { fontSize: 14, fontWeight: "500", color: "#64748b", width: 100 },
  value: { fontSize: 14, color: "#1e293b", flex: 1 },
  biometricCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
  },
  biometricLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  biometricTitle: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  biometricSubtitle: { fontSize: 12, color: "#64748b", marginTop: 2 },
  logoutButton: {
    flexDirection: "row",
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    margin: 20,
    gap: 8,
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
