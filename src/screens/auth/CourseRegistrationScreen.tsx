import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { api } from "../../services/api";
import { useAuthStore } from "../../store/authStore";

interface Course {
  _id: string;
  courseCode: string;
  courseTitle: string;
  creditUnits: number;
  lecturerId: {
    fullName: string;
  };
  isEnrolled: boolean;
}

export const CourseRegistrationScreen = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(
    new Set(),
  );
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { user, checkAuth } = useAuthStore();

  useEffect(() => {
    loadAvailableCourses();
  }, []);

  const loadAvailableCourses = async () => {
    try {
      const response = await api.get("/enrollment/available-courses");
      const availableCourses = response.data?.data?.courses || [];
      setCourses(availableCourses);
    } catch (error) {
      console.error("Failed to load courses:", error);
      Alert.alert("Error", "Failed to load available courses");
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (courseId: string) => {
    const newSelected = new Set(selectedCourses);
    if (newSelected.has(courseId)) {
      newSelected.delete(courseId);
    } else {
      newSelected.add(courseId);
    }
    setSelectedCourses(newSelected);
  };

  const handleSubmit = () => {
    if (selectedCourses.size === 0) {
      Alert.alert("Error", "Please select at least one course");
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmEnrollment = async () => {
    setSubmitting(true);
    setShowConfirmModal(false);

    try {
      await api.post("/enrollment/submit", {
        courseIds: Array.from(selectedCourses),
        confirmations: {
          readWarning: true,
          understandIrreversible: true,
        },
      });

      Alert.alert("Success", "Course registration completed!", [
        { text: "OK", onPress: () => checkAuth() }, // Refresh auth state
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to register courses",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const renderCourseCard = ({ item }: { item: Course }) => (
    <TouchableOpacity
      style={[
        styles.courseCard,
        selectedCourses.has(item._id) && styles.courseCardSelected,
      ]}
      onPress={() => toggleCourse(item._id)}
      disabled={submitting}
    >
      <View style={styles.courseInfo}>
        <Text style={styles.courseCode}>{item.courseCode}</Text>
        <Text style={styles.courseTitle}>{item.courseTitle}</Text>
        <Text style={styles.courseDetails}>
          {item.creditUnits} credits • Lecturer:{" "}
          {item.lecturerId?.fullName || "TBA"}
        </Text>
      </View>
      <View
        style={[
          styles.checkbox,
          selectedCourses.has(item._id) && styles.checkboxSelected,
        ]}
      >
        {selectedCourses.has(item._id) && (
          <Text style={styles.checkmark}>✓</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Course Registration</Text>
        <Text style={styles.subtitle}>
          Select your courses for this semester
        </Text>

        <View style={styles.warningBox}>
          <Text style={styles.warningIcon}>⚠️</Text>
          <Text style={styles.warningText}>
            This action is IRREVERSIBLE for the semester. Choose carefully!
          </Text>
        </View>
      </View>

      <FlatList
        data={courses}
        keyExtractor={(item) => item._id}
        renderItem={renderCourseCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📚</Text>
            <Text style={styles.emptyTitle}>No Available Courses</Text>
            <Text style={styles.emptyText}>
              There are no courses available for registration at this time.
              Please contact your department.
            </Text>
          </View>
        }
      />

      <View style={styles.footer}>
        <Text style={styles.selectedCount}>
          Selected: {selectedCourses.size} course
          {selectedCourses.size !== 1 ? "s" : ""}
        </Text>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (selectedCourses.size === 0 || submitting) &&
              styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={selectedCourses.size === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.submitButtonText}>Confirm Enrollment</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Confirm Enrollment</Text>
            <Text style={styles.modalMessage}>
              You are about to enroll in {selectedCourses.size} course(s). This
              action CANNOT be undone for the entire semester.
            </Text>
            <View style={styles.modalChecklist}>
              <Text style={styles.checklistItem}>
                ✓ I have read and understood the warning
              </Text>
              <Text style={styles.checklistItem}>
                ✓ I understand this is irreversible
              </Text>
              <Text style={styles.checklistItem}>
                ✓ I confirm my course selection
              </Text>
            </View>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmEnrollment}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    styles.modalButtonConfirmText,
                  ]}
                >
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
  },
  subtitle: { fontSize: 14, color: "#64748b", marginBottom: 16 },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    padding: 12,
    borderRadius: 12,
    gap: 12,
  },
  warningIcon: { fontSize: 20 },
  warningText: { flex: 1, fontSize: 13, color: "#92400e", fontWeight: "500" },
  listContent: { padding: 16, gap: 12 },
  courseCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  courseCardSelected: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  courseInfo: { flex: 1 },
  courseCode: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#2563eb",
    marginBottom: 4,
  },
  courseTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 4,
  },
  courseDetails: { fontSize: 12, color: "#64748b" },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#cbd5e1",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  checkboxSelected: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  checkmark: { fontSize: 16, color: "#fff", fontWeight: "bold" },
  footer: {
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedCount: { fontSize: 14, color: "#64748b" },
  submitButton: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  emptyState: { alignItems: "center", padding: 40 },
  emptyEmoji: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, color: "#64748b", textAlign: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#dc2626",
    marginBottom: 12,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    color: "#334155",
    marginBottom: 16,
    textAlign: "center",
  },
  modalChecklist: { marginBottom: 20, gap: 8 },
  checklistItem: { fontSize: 13, color: "#166534" },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonCancel: { backgroundColor: "#f1f5f9" },
  modalButtonConfirm: { backgroundColor: "#dc2626" },
  modalButtonText: { fontSize: 14, fontWeight: "600", color: "#334155" },
  modalButtonConfirmText: { color: "#fff" },
});
