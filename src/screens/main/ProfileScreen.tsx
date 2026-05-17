import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuthStore } from "../../store/authStore";
import { useBiometric } from "../../hooks/useBiometric";

export const ProfileScreen = () => {
  const { user, logout } = useAuthStore();
  const { isRegistered, checkDeviceRegistration, registerDevice, isLoading } =
    useBiometric();
  const [biometricStatus, setBiometricStatus] = useState<
    "registered" | "not_registered" | "checking"
  >("checking");

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    const registered = await checkDeviceRegistration();
    setBiometricStatus(registered ? "registered" : "not_registered");
  };

  const handleBiometricSetup = async () => {
    if (biometricStatus === "registered") {
      Alert.alert(
        "Already Setup",
        "Biometric authentication is already configured",
      );
      return;
    }

    const result = await registerDevice();
    if (result.success) {
      setBiometricStatus("registered");
      Alert.alert("Success", "Biometric authentication setup complete!");
    } else {
      Alert.alert(
        "Setup Failed",
        result.error || "Could not setup biometric authentication",
      );
    }
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
          <Text style={styles.value}>{user?.email || "-"}</Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="business-outline" size={20} color="#64748b" />
          <Text style={styles.label}>Department</Text>
          <Text style={styles.value}>{user?.department || "-"}</Text>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="trending-up-outline" size={20} color="#64748b" />
          <Text style={styles.label}>Level</Text>
          <Text style={styles.value}>{user?.level || "-"}</Text>
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

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
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
    marginBottom: 16,
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
    marginBottom: 2,
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
  label: { fontSize: 14, fontWeight: "500", color: "#64748b", width: 90 },
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
