import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  studentService,
  AttendanceRecord,
} from "../../services/studentService";

export const HistoryScreen = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadHistory = useCallback(async (pageNum: number, refresh = false) => {
    try {
      const response = await studentService.getAttendanceHistory({
        page: pageNum,
        limit: 20,
      });
      setHasMore(pageNum < response.pagination.pages);
      if (refresh) {
        setRecords(response.records);
      } else {
        setRecords((prev) => [...prev, ...response.records]);
      }
    } catch (error) {
      console.error("Failed to load history:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHistory(1, true);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    loadHistory(1, true);
  };

  const loadMore = () => {
    if (!hasMore || loading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    loadHistory(nextPage, false);
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "biometric":
        return "finger-print";
      case "qr":
        return "qr-code";
      default:
        return "cloud-offline";
    }
  };

  const getMethodName = (method: string) => {
    switch (method) {
      case "biometric":
        return "Biometric";
      case "qr":
        return "QR Code";
      default:
        return "Offline";
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case "biometric":
        return "#3b82f6";
      case "qr":
        return "#8b5cf6";
      default:
        return "#f59e0b";
    }
  };

  const renderRecord = ({ item }: { item: AttendanceRecord }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.courseCode}>{item.sessionId.courseCode}</Text>
        <View
          style={[
            styles.methodBadge,
            { backgroundColor: `${getMethodColor(item.method)}10` },
          ]}
        >
          <Ionicons
            name={getMethodIcon(item.method) as any}
            size={12}
            color={getMethodColor(item.method)}
          />
          <Text
            style={[styles.methodText, { color: getMethodColor(item.method) }]}
          >
            {getMethodName(item.method)}
          </Text>
        </View>
      </View>
      <Text style={styles.courseTitle}>{item.sessionId.courseTitle}</Text>
      <View style={styles.recordFooter}>
        <Ionicons name="calendar-outline" size={14} color="#64748b" />
        <Text style={styles.date}>
          {new Date(item.timestamp).toLocaleDateString()}
        </Text>
        <Ionicons name="time-outline" size={14} color="#64748b" />
        <Text style={styles.time}>
          {new Date(item.timestamp).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );

  if (loading && records.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <FlatList
      data={records}
      keyExtractor={(item) => item._id}
      renderItem={renderRecord}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={["#2563eb"]}
        />
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>No Attendance Records</Text>
          <Text style={styles.emptyText}>
            Your attendance history will appear here once you start marking
            attendance.
          </Text>
        </View>
      }
      ListFooterComponent={
        hasMore && records.length > 0 ? (
          <ActivityIndicator
            style={styles.footerLoader}
            size="small"
            color="#2563eb"
          />
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: { padding: 16, flexGrow: 1 },
  recordCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  courseCode: { fontSize: 16, fontWeight: "bold", color: "#2563eb" },
  methodBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  methodText: { fontSize: 11, fontWeight: "500" },
  courseTitle: { fontSize: 14, color: "#1e293b", marginBottom: 12 },
  recordFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 12,
  },
  date: { fontSize: 12, color: "#64748b", marginRight: 12 },
  time: { fontSize: 12, color: "#64748b" },
  emptyState: { alignItems: "center", padding: 48 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  emptyText: { fontSize: 14, color: "#64748b", textAlign: "center" },
  footerLoader: { paddingVertical: 16 },
});
