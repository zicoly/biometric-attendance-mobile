import { useState, useCallback } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { studentService } from "../services/studentService";

export const useBiometric = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkBiometricAvailability = useCallback(async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const available = hasHardware && isEnrolled;
    setIsAvailable(available);
    return available;
  }, []);

  const checkDeviceRegistration = useCallback(async () => {
    try {
      const deviceId = await SecureStore.getItemAsync("deviceId");
      const isDeviceRegistered = !!deviceId;
      setIsRegistered(isDeviceRegistered);
      return isDeviceRegistered;
    } catch (error) {
      console.error("checkDeviceRegistration error:", error);
      return false;
    }
  }, []);

  const registerDevice = useCallback(async () => {
    setIsLoading(true);
    try {
      const deviceId = `device_${Date.now()}`;
      const deviceName = "Mobile Device";
      const publicKey = `public_key_${Date.now()}`;

      await studentService.registerDevice(deviceId, deviceName, publicKey);
      await SecureStore.setItemAsync("deviceId", deviceId);
      await SecureStore.setItemAsync("privateKey", `private_key_${Date.now()}`);

      setIsRegistered(true);
      return { success: true, deviceId };
    } catch (error: any) {
      console.error("registerDevice error:", error);
      return { success: false, error: error.message || String(error) };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const markAttendanceWithBiometric = useCallback(
    async (
      sessionId: string,
      location?: { latitude: number; longitude: number },
    ) => {
      setIsLoading(true);
      let retryCount = 0;
      const MAX_RETRIES = 2;

      const attemptMarking = async (): Promise<{
        success: boolean;
        error?: string;
      }> => {
        try {
          const deviceId = await SecureStore.getItemAsync("deviceId");
          if (!deviceId) {
            return { success: false, error: "Device not registered" };
          }

          // Get new challenge
          console.log("📡 Getting biometric challenge...");
          const challengeData =
            await studentService.getBiometricChallenge(deviceId);
          console.log("📦 Challenge received:", challengeData.challenge);
          console.log("📦 Challenge expires at:", challengeData.expiresAt);

          // Check if challenge is already expired
          const expiresAt = new Date(challengeData.expiresAt);
          const now = new Date();
          if (expiresAt <= now) {
            console.log("⚠️ Challenge already expired, retrying...");
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              return await attemptMarking();
            }
            return {
              success: false,
              error: "Challenge expired. Please try again.",
            };
          }

          // Authenticate with device biometrics
          const authResult = await LocalAuthentication.authenticateAsync({
            promptMessage: "Authenticate to mark attendance",
            fallbackLabel: "Use passcode",
          });

          if (!authResult.success) {
            return { success: false, error: "Authentication failed" };
          }

          // IMPORTANT: Send the actual challenge as the signature
          // The backend validates that signature matches the stored challenge
          const signature = challengeData.challenge;

          console.log(
            "✍️ Sending signature (challenge):",
            signature.substring(0, 50) + "...",
          );

          // Send to server
          await studentService.markBiometricAttendance(
            sessionId,
            deviceId,
            signature,
            new Date().toISOString(),
            location,
          );

          return { success: true };
        } catch (error: any) {
          console.error("❌ Biometric error:", error);
          console.error("Error response:", error.response?.data);

          // Check if it's an expired challenge error
          const errorMessage =
            error.response?.data?.message || error.message || "";
          if (
            errorMessage.toLowerCase().includes("expired") &&
            retryCount < MAX_RETRIES
          ) {
            console.log(
              `🔄 Challenge expired, retrying (${retryCount + 1}/${MAX_RETRIES})...`,
            );
            retryCount++;
            return await attemptMarking();
          }

          return {
            success: false,
            error:
              error.response?.data?.message ||
              error.message ||
              "Failed to mark attendance",
          };
        }
      };

      const result = await attemptMarking();
      setIsLoading(false);
      return result;
    },
    [],
  );

  return {
    isAvailable,
    isRegistered,
    isLoading,
    checkBiometricAvailability,
    checkDeviceRegistration,
    registerDevice,
    markAttendanceWithBiometric,
  };
};
