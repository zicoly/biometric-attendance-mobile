import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "../store/authStore";
import { LoginScreen } from "../screens/auth/LoginScreen";
import { SignupScreen } from "../screens/auth/SignupScreen";
import { CourseRegistrationScreen } from "../screens/auth/CourseRegistrationScreen";
import { BiometricSetupScreen } from "../screens/auth/BiometricSetupScreen";
import { TabNavigator } from "./TabNavigator";
import { api } from "../services/api";
import * as SecureStore from "expo-secure-store";

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isBiometricSetup, setIsBiometricSetup] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [hasAttendance, setHasAttendance] = useState(false);

  useEffect(() => {
    console.log("RootNavigator: Checking auth...");
    checkAuth();
  }, []);

  useEffect(() => {
    const checkUserStatus = async () => {
      console.log(
        "RootNavigator: Checking user status, isAuthenticated:",
        isAuthenticated,
      );

      if (isAuthenticated && user) {
        try {
          // First, check if user has any attendance records
          // This indicates they have actually completed course registration
          console.log("RootNavigator: Checking attendance records...");
          let hasAttendanceRecords = false;
          try {
            const historyRes = await api.get("/attendance/history?limit=1");
            const records = historyRes.data?.data?.records || [];
            hasAttendanceRecords = records.length > 0;
            setHasAttendance(hasAttendanceRecords);
            console.log(
              "RootNavigator: Has attendance records:",
              hasAttendanceRecords,
            );
          } catch (error) {
            console.log("RootNavigator: No attendance records found");
            hasAttendanceRecords = false;
          }

          // Check if enrolled in courses (student submitted course registration)
          console.log("RootNavigator: Fetching enrolled courses...");
          const enrollmentRes = await api.get("/enrollment/my-courses");
          const courses = enrollmentRes.data?.data?.courses || [];
          const hasEnrolledCourses = courses.length > 0;

          // A student is considered "enrolled" if they have either:
          // 1. Submitted course registration (has enrolled courses)
          // 2. Has attendance records (means they already registered and attended)
          const shouldShowMainApp = hasEnrolledCourses || hasAttendanceRecords;

          setIsEnrolled(shouldShowMainApp);
          console.log(
            "RootNavigator: Has enrolled courses:",
            hasEnrolledCourses,
          );
          console.log(
            "RootNavigator: Should show main app:",
            shouldShowMainApp,
          );

          // Check if biometric is set up
          const deviceId = await SecureStore.getItemAsync("deviceId");
          const hasBiometric = !!deviceId;
          setIsBiometricSetup(hasBiometric);
          console.log("RootNavigator: Biometric setup:", hasBiometric);
        } catch (error) {
          console.error("RootNavigator: Failed to check user status:", error);
          setIsEnrolled(false);
          setIsBiometricSetup(false);
        }
      } else {
        console.log("RootNavigator: Not authenticated or no user");
        setIsEnrolled(false);
        setIsBiometricSetup(false);
      }
      setCheckingStatus(false);
    };

    checkUserStatus();
  }, [isAuthenticated, user]);

  if (isLoading || checkingStatus) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  console.log(
    "RootNavigator: Showing screen - isAuthenticated:",
    isAuthenticated,
    "isEnrolled:",
    isEnrolled,
    "isBiometricSetup:",
    isBiometricSetup,
    "hasAttendance:",
    hasAttendance,
  );

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          // Not logged in - show auth screens
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Signup" component={SignupScreen} />
          </>
        ) : !isEnrolled ? (
          // Logged in but not enrolled (no courses and no attendance) - show course registration
          <Stack.Screen
            name="CourseRegistration"
            component={CourseRegistrationScreen}
          />
        ) : !isBiometricSetup ? (
          // Logged in, enrolled, but no biometric - show biometric setup
          <Stack.Screen
            name="BiometricSetup"
            component={BiometricSetupScreen}
          />
        ) : (
          // Logged in, enrolled, biometric setup - show main app
          <Stack.Screen name="Main" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
