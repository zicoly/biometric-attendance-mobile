import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuthStore } from "../../store/authStore";
import { studentService, EnrolledCourse } from "../../services/studentService";

export const DashboardScreen = () => {
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuthStore();
  const navigation = useNavigation();

  const loadData = useCallback(async () => {
    try {
      const enrolledCourses = await studentService.getMyEnrolledCourses();
      setCourses(enrolledCourses);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Calculate totals safely
  const totalCourses = courses.length;
  const totalAttendance = courses.reduce(
    (sum, c) => sum + (c.attendedSessions || 0),
    0,
  );
  const totalPossible = courses.reduce(
    (sum, c) => sum + (c.totalSessions || 0),
    0,
  );
  const overallRate =
    totalPossible > 0
      ? ((totalAttendance / totalPossible) * 100).toFixed(1)
      : "0";

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#2563eb"]}
        />
      }
    >
      {/* Welcome Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>
            {user?.fullName?.split(" ")[0] || "Student"}
          </Text>
          <Text style={styles.matricNumber}>{user?.matricNumber}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.fullName?.charAt(0) || "S"}
          </Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalCourses}</Text>
          <Text style={styles.statLabel}>Enrolled Courses</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalAttendance}</Text>
          <Text style={styles.statLabel}>Total Attendance</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{overallRate}%</Text>
          <Text style={styles.statLabel}>Overall Rate</Text>
        </View>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("Classes" as never)}
        >
          <Text style={styles.actionIcon}>📚</Text>
          <Text style={styles.actionText}>Mark Attendance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate("History" as never)}
        >
          <Text style={styles.actionIcon}>📋</Text>
          <Text style={styles.actionText}>View History</Text>
        </TouchableOpacity>
      </View>

      {/* Enrolled Courses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My Courses</Text>
        {courses.length === 0 ? (
          <View style={styles.emptyCourses}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyText}>No courses enrolled yet</Text>
            <TouchableOpacity
              style={styles.enrollButton}
              onPress={() => navigation.navigate("Classes" as never)}
            >
              <Text style={styles.enrollButtonText}>Go to Classes</Text>
            </TouchableOpacity>
          </View>
        ) : (
          courses.map((course) => (
            <View key={course._id} style={styles.courseCard}>
              <View style={styles.courseHeader}>
                <Text style={styles.courseCode}>{course.courseCode}</Text>
                <Text style={styles.creditUnits}>
                  {course.creditUnits} credits
                </Text>
              </View>
              <Text style={styles.courseTitle}>{course.courseTitle}</Text>
              <Text style={styles.lecturer}>
                Lecturer: {course.lecturer || "TBA"}
              </Text>

              <View style={styles.attendanceRow}>
                <Text style={styles.attendanceLabel}>Attendance:</Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${course.attendanceRate || 0}%` },
                      (course.attendanceRate || 0) >= 75
                        ? styles.progressGood
                        : (course.attendanceRate || 0) >= 50
                          ? styles.progressWarning
                          : styles.progressBad,
                    ]}
                  />
                </View>
                <Text style={styles.attendanceRate}>
                  {course.attendanceRate || 0}%
                </Text>
              </View>
              <Text style={styles.sessionCount}>
                {course.attendedSessions || 0} / {course.totalSessions || 0}{" "}
                sessions attended
              </Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#2563eb",
    padding: 24,
    paddingTop: 48,
    paddingBottom: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcomeText: { fontSize: 14, color: "#bfdbfe" },
  userName: { fontSize: 24, fontWeight: "bold", color: "#fff", marginTop: 4 },
  matricNumber: { fontSize: 12, color: "#bfdbfe", marginTop: 4 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 24, fontWeight: "bold", color: "#2563eb" },
  statsGrid: { flexDirection: "row", padding: 16, gap: 12, marginTop: -20 },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: { fontSize: 24, fontWeight: "bold", color: "#1e293b" },
  statLabel: { fontSize: 12, color: "#64748b", marginTop: 4 },
  quickActions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  actionIcon: { fontSize: 24, marginBottom: 8 },
  actionText: { fontSize: 12, fontWeight: "600", color: "#2563eb" },
  section: { padding: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
  },
  emptyCourses: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: "#64748b", marginBottom: 16 },
  enrollButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  enrollButtonText: { color: "#fff", fontWeight: "600" },
  courseCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  courseHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  courseCode: { fontSize: 16, fontWeight: "bold", color: "#2563eb" },
  creditUnits: { fontSize: 12, color: "#64748b" },
  courseTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1e293b",
    marginBottom: 4,
  },
  lecturer: { fontSize: 12, color: "#64748b", marginBottom: 12 },
  attendanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  attendanceLabel: { fontSize: 12, color: "#64748b", width: 70 },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: "#e2e8f0",
    borderRadius: 3,
    overflow: "hidden",
    marginHorizontal: 8,
  },
  progressFill: { height: "100%", borderRadius: 3 },
  progressGood: { backgroundColor: "#22c55e" },
  progressWarning: { backgroundColor: "#f59e0b" },
  progressBad: { backgroundColor: "#ef4444" },
  attendanceRate: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1e293b",
    width: 40,
    textAlign: "right",
  },
  sessionCount: {
    fontSize: 11,
    color: "#64748b",
    marginLeft: 70,
    marginBottom: 12,
  },
  markButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  markButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
