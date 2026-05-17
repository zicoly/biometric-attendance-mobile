import { useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { studentService } from "../services/studentService";

// Set to true to skip actual API calls for testing biometrics
const TEST_MODE = true;  // ← Change to false for production

export const useBiometric = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const checkBiometricAvailability = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    const available = hasHardware && isEnrolled;
    setIsAvailable(available);
    return available;
  };

  const checkDeviceRegistration = async () => {
    if (TEST_MODE) {
      console.log("🧪 TEST MODE: Simulating device registration");
      return true;
    }
    const deviceId = await SecureStore.getItemAsync("deviceId");
    if (!deviceId) return false;
    setIsRegistered(true);
    return true;
  };

  const registerDevice = async () => {
    setIsLoading(true);
    try {
      if (TEST_MODE) {
        console.log("🧪 TEST MODE: Simulating device registration");
        await SecureStore.setItemAsync("deviceId", `test_device_${Date.now()}`);
        await SecureStore.setItemAsync("privateKey", `test_private_key_${Date.now()}`);
        setIsRegistered(true);
        return { success: true, deviceId: "test_device" };
      }

      const deviceId = `device_${Date.now()}`;
      const deviceName = "Mobile Device";
      const publicKey = `public_key_${Date.now()}`;

      await studentService.registerDevice(deviceId, deviceName, publicKey);
      await SecureStore.setItemAsync("deviceId", deviceId);
      await SecureStore.setItemAsync("privateKey", `private_key_${Date.now()}`);

      setIsRegistered(true);
      return { success: true, deviceId };
    } catch (error) {
      return { success: false, error: String(error) };
    } finally {
      setIsLoading(false);
    }
  };

  const markAttendanceWithBiometric = async (
    sessionId: string,
    location?: { latitude: number; longitude: number },
  ) => {
    setIsLoading(true);
    
    // TEST MODE: Skip actual API calls
    if (TEST_MODE) {
      console.log("🧪 TEST MODE: Simulating biometric attendance marking");
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      setIsLoading(false);
      return { success: true };
    }

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
        const challengeData = await studentService.getBiometricChallenge(deviceId);
        console.log("📦 Challenge received, expires at:", challengeData.expiresAt);

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

        // Sign the challenge
        const signature = `signed_${challengeData.challenge}_${Date.now()}`;

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

        // If error is about expired challenge, retry
        if (
          error.response?.data?.message?.toLowerCase().includes("expired") &&
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
  };

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