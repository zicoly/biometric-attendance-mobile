import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useAuthStore } from "../../store/authStore";

export const ProfileScreen = () => {
  const { user, logout } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.infoCard}>
        <Text style={styles.label}>Name:</Text>
        <Text style={styles.value}>{user?.fullName || "Not logged in"}</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.label}>Matric:</Text>
        <Text style={styles.value}>{user?.matricNumber || "-"}</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{user?.email || "-"}</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.label}>Department:</Text>
        <Text style={styles.value}>{user?.department || "-"}</Text>
      </View>
      <View style={styles.infoCard}>
        <Text style={styles.label}>Level:</Text>
        <Text style={styles.value}>{user?.level || "-"}</Text>
      </View>
      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 20 },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 30,
    textAlign: "center",
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  label: { fontSize: 16, fontWeight: "600", color: "#334155", width: 100 },
  value: { fontSize: 16, color: "#1e293b", flex: 1 },
  logoutButton: {
    backgroundColor: "#ef4444",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 20,
  },
  logoutText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
