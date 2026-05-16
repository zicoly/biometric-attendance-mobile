import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, ActivityIndicator } from "react-native";
import { useAuthStore } from "../store/authStore";
import { AuthNavigator } from "./AuthNavigator";
import { TabNavigator } from "./TabNavigator";
import { api } from "../services/api";
import { CourseRegistrationScreen } from "../screens/auth/CourseRegistrationScreen";

const Stack = createNativeStackNavigator();

export const RootNavigator = () => {
  const { isAuthenticated, isLoading, checkAuth, user } = useAuthStore();
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [checkingEnrollment, setCheckingEnrollment] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const checkEnrollment = async () => {
      if (isAuthenticated && user) {
        try {
          const response = await api.get("/enrollment/my-courses");
          const courses = response.data?.data?.courses || [];
          setIsEnrolled(courses.length > 0);
        } catch (error) {
          console.error("Failed to check enrollment:", error);
          setIsEnrolled(false);
        } finally {
          setCheckingEnrollment(false);
        }
      } else {
        setCheckingEnrollment(false);
      }
    };

    checkEnrollment();
  }, [isAuthenticated, user]);

  if (isLoading || checkingEnrollment) {
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

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : !isEnrolled ? (
          <Stack.Screen
            name="CourseRegistration"
            component={CourseRegistrationScreen}
          />
        ) : (
          <Stack.Screen name="Main" component={TabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
