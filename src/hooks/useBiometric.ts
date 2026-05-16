import { useState } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import { studentService } from "../services/studentService";

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
    const deviceId = await SecureStore.getItemAsync("deviceId");
    if (!deviceId) return false;
    setIsRegistered(true);
    return true;
  };

  const registerDevice = async () => {
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
    try {
      const deviceId = await SecureStore.getItemAsync("deviceId");
      if (!deviceId) return { success: false, error: "Device not registered" };

      const authResult = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to mark attendance",
      });

      if (!authResult.success)
        return { success: false, error: "Authentication failed" };

      const challengeData =
        await studentService.getBiometricChallenge(deviceId);
      const signature = `signed_${challengeData.challenge}_${Date.now()}`;

      await studentService.markBiometricAttendance(
        sessionId,
        deviceId,
        signature,
        new Date().toISOString(),
        location,
      );

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || "Failed to mark attendance",
      };
    } finally {
      setIsLoading(false);
    }
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
