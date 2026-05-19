import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useNavigation, CommonActions } from "@react-navigation/native";
import { useBiometric } from "../../hooks/useBiometric";
import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";

export const BiometricSetupScreen = () => {
  const navigation = useNavigation();
  const [step, setStep] = useState<
    "checking" | "prompt" | "registering" | "success" | "fallback"
  >("checking");
  const [biometricType, setBiometricType] = useState<string>("Biometric");
  const { registerDevice } = useBiometric();

  useEffect(() => {
    checkBiometricSupport();
  }, []);

  const checkBiometricSupport = async () => {
    setStep("checking");

    const compatible = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const supportedTypes =
      await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (
      supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      )
    ) {
      setBiometricType("Face ID");
    } else if (
      supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      )
    ) {
      setBiometricType("Fingerprint");
    } else {
      setBiometricType("Biometric");
    }

    if (!compatible) {
      setStep("fallback");
    } else if (!enrolled) {
      setStep("fallback");
    } else {
      setStep("prompt");
    }
  };

  const navigateToDashboard = () => {
    // Reset navigation stack to Main
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Main" }],
      }),
    );
  };

  const handleSetupBiometric = async () => {
    setStep("registering");

    const authResult = await LocalAuthentication.authenticateAsync({
      promptMessage: `Set up ${biometricType} for attendance`,
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });

    if (!authResult.success) {
      Alert.alert("Authentication Failed", "Please try again or skip for now");
      setStep("prompt");
      return;
    }

    const result = await registerDevice();
    const navigateBackToProfile = () => {
      navigation.goBack(); // Go back to Profile screen
    };

    // In handleSetupBiometric after success:
    if (result.success) {
      setStep("success");
      setTimeout(() => {
        navigateBackToProfile();
      }, 1500);
    } else {
      Alert.alert("Setup Failed", result.error || "Could not register device", [
        { text: "Try Again", onPress: () => setStep("prompt") },
        { text: "Skip", onPress: () => navigateToDashboard() },
      ]);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip Biometric Setup",
      "You can still mark attendance using QR codes. You can set up biometrics later in Profile.",
      [
        { text: "Set Up Later", onPress: () => navigateToDashboard() },
        { text: "Set Up Now", onPress: () => setStep("prompt") },
      ],
    );
  };

  if (step === "checking") {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.checkingText}>
          Checking device compatibility...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          {step === "registering" ? (
            <ActivityIndicator size="large" color="#2563eb" />
          ) : (
            <Ionicons
              name={
                step === "success"
                  ? "checkmark-circle"
                  : biometricType === "Face ID"
                    ? "scan"
                    : "finger-print"
              }
              size={80}
              color={step === "success" ? "#22c55e" : "#2563eb"}
            />
          )}
        </View>

        <Text style={styles.title}>
          {step === "prompt" && `Enable ${biometricType}`}
          {step === "registering" && "Registering Device..."}
          {step === "success" && "Setup Complete!"}
          {step === "fallback" && `${biometricType} Not Available`}
        </Text>

        <Text style={styles.description}>
          {step === "prompt" &&
            `Use ${biometricType} to quickly and securely mark your attendance. Your biometric data never leaves your device.`}
          {step === "registering" &&
            "Registering your device with the server..."}
          {step === "success" &&
            `Your ${biometricType} has been successfully registered! Taking you to the dashboard...`}
          {step === "fallback" &&
            `Your device doesn't support ${biometricType} or has no biometrics enrolled. You can still use QR codes to mark attendance.`}
        </Text>

        {step === "prompt" && (
          <TouchableOpacity
            style={styles.setupButton}
            onPress={handleSetupBiometric}
          >
            <Ionicons
              name={
                biometricType === "Face ID"
                  ? "scan-outline"
                  : "finger-print-outline"
              }
              size={20}
              color="#fff"
            />
            <Text style={styles.setupButtonText}>Set Up {biometricType}</Text>
          </TouchableOpacity>
        )}

        {step === "prompt" && (
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipButtonText}>Skip for Now</Text>
          </TouchableOpacity>
        )}

        {step === "fallback" && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={navigateToDashboard}
          >
            <Text style={styles.continueButtonText}>Continue to Dashboard</Text>
          </TouchableOpacity>
        )}

        {(step === "prompt" || step === "fallback") && (
          <View style={styles.securityNote}>
            <Ionicons name="shield-checkmark" size={16} color="#64748b" />
            <Text style={styles.securityNoteText}>
              Your biometric data is encrypted and never shared with servers
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  checkingText: { marginTop: 16, color: "#64748b", fontSize: 14 },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 15,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
  },
  setupButton: {
    flexDirection: "row",
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
    width: "100%",
    justifyContent: "center",
  },
  setupButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  skipButton: { paddingVertical: 12, alignItems: "center" },
  skipButtonText: { color: "#64748b", fontSize: 14 },
  continueButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
  },
  continueButtonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  securityNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 32,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  securityNoteText: { fontSize: 11, color: "#64748b", flex: 1 },
});
