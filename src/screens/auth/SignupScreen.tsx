import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { api } from "../../services/api";

const DEPARTMENTS = [
  "Computer Science",
  "Mathematics",
  "Physics",
  "Chemistry",
  "Engineering",
];
const LEVELS = [100, 200, 300, 400, 500];

export const SignupScreen = () => {
  const [loading, setLoading] = useState(false);
  const navigation = useNavigation();
  const [form, setForm] = useState({
    fullName: "",
    matricNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: DEPARTMENTS[0],
    level: 200,
  });
  const [showDepartmentPicker, setShowDepartmentPicker] = useState(false);
  const [showLevelPicker, setShowLevelPicker] = useState(false);

  const handleSignup = async () => {
    if (!form.fullName || !form.matricNumber || !form.email || !form.password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (form.password !== form.confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (form.password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/register", {
        fullName: form.fullName,
        matricNumber: form.matricNumber,
        email: form.email,
        password: form.password,
        role: "student",
        department: form.department,
        level: form.level,
      });
      Alert.alert("Success", "Account created! Please login.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert(
        "Signup Failed",
        error.response?.data?.message || "Registration failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Register as a student</Text>
        </View>

        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            value={form.fullName}
            onChangeText={(text) => setForm({ ...form, fullName: text })}
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Matric Number (e.g., 21/1234CS)"
            value={form.matricNumber}
            onChangeText={(text) => setForm({ ...form, matricNumber: text })}
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={form.email}
            onChangeText={(text) => setForm({ ...form, email: text })}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          {/* Department Picker */}
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowDepartmentPicker(!showDepartmentPicker)}
          >
            <Text style={styles.pickerButtonText}>
              Department: {form.department}
            </Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>
          {showDepartmentPicker && (
            <View style={styles.pickerDropdown}>
              {DEPARTMENTS.map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={styles.pickerOption}
                  onPress={() => {
                    setForm({ ...form, department: dept });
                    setShowDepartmentPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{dept}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Level Picker */}
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowLevelPicker(!showLevelPicker)}
          >
            <Text style={styles.pickerButtonText}>Level: {form.level}</Text>
            <Text style={styles.pickerArrow}>▼</Text>
          </TouchableOpacity>
          {showLevelPicker && (
            <View style={styles.pickerDropdown}>
              {LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  style={styles.pickerOption}
                  onPress={() => {
                    setForm({ ...form, level });
                    setShowLevelPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>{level}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Password (min 6 characters)"
            value={form.password}
            onChangeText={(text) => setForm({ ...form, password: text })}
            secureTextEntry
            editable={!loading}
          />
          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign Up</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.loginText}>
              Already have an account?{" "}
              <Text style={styles.loginTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  scrollContent: { flexGrow: 1, paddingVertical: 40, paddingHorizontal: 24 },
  header: { marginBottom: 32, alignItems: "center" },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 8,
  },
  subtitle: { fontSize: 16, color: "#64748b" },
  form: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  pickerButtonText: { fontSize: 16, color: "#334155" },
  pickerArrow: { fontSize: 12, color: "#64748b" },
  pickerDropdown: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
    overflow: "hidden",
  },
  pickerOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  pickerOptionText: { fontSize: 14, color: "#334155" },
  button: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  loginLink: { marginTop: 20, alignItems: "center" },
  loginText: { fontSize: 14, color: "#64748b" },
  loginTextBold: { color: "#2563eb", fontWeight: "600" },
});
