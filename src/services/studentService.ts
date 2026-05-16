import { api } from "./api";

const unwrap = (raw: any) => raw?.data ?? raw;

export interface EnrolledCourse {
  _id: string;
  courseCode: string;
  courseTitle: string;
  creditUnits: number;
  lecturer: string;
  attendanceRate: number;
  totalSessions: number;
  attendedSessions: number;
}

export interface Session {
  _id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  startTime: string;
  endTime: string;
  qrEnabled: boolean;
  status: "active" | "ended" | "scheduled";
  hasMarked: boolean;
}

export interface AttendanceRecord {
  _id: string;
  sessionId: {
    courseCode: string;
    courseTitle: string;
    startTime: string;
    _id: string;
  };
  timestamp: string;
  method: "biometric" | "qr" | "offline";
}

export interface AttendanceStats {
  totalAttendance: number;
  byMethod: Array<{ _id: string; count: number }>;
}

export const studentService = {
  async getMyEnrolledCourses(): Promise<EnrolledCourse[]> {
    const response = await api.get("/enrollment/my-courses");
    const courses = unwrap(response.data)?.courses ?? [];

    // Map the response to match our interface
    return courses.map((course: any) => ({
      _id: course._id,
      courseCode: course.courseCode,
      courseTitle: course.courseTitle,
      creditUnits: course.creditUnits,
      lecturer: course.lecturerId?.fullName || course.lecturer || "TBA",
      attendanceRate: course.attendanceRate || 0,
      totalSessions: course.totalSessions || 0,
      attendedSessions: course.attendedSessions || 0,
    }));
  },

  async getActiveSessions(): Promise<Session[]> {
    const response = await api.get("/sessions/student/active");
    return unwrap(response.data)?.sessions ?? [];
  },

  async getUpcomingSessions(): Promise<Session[]> {
    const response = await api.get("/sessions/student/upcoming");
    return unwrap(response.data)?.sessions ?? [];
  },

  async validateSession(
    sessionId: string,
  ): Promise<{ isValid: boolean; canMark: boolean; message: string }> {
    const response = await api.get(`/sessions/student/${sessionId}/validate`);
    return unwrap(response.data);
  },

  async markBiometricAttendance(
    sessionId: string,
    deviceId: string,
    signature: string,
    timestamp: string,
    location?: { latitude: number; longitude: number },
  ): Promise<void> {
    await api.post("/attendance/mark/biometric", {
      sessionId,
      deviceId,
      signature,
      timestamp,
      location,
    });
  },

  async markQRAttendance(
    qrToken: string,
    timestamp: string,
    location?: { latitude: number; longitude: number },
  ): Promise<void> {
    await api.post("/attendance/mark/qr", { qrToken, timestamp, location });
  },

  async getAttendanceHistory(params?: {
    page?: number;
    limit?: number;
    courseId?: string;
  }): Promise<{
    records: AttendanceRecord[];
    stats: AttendanceStats;
    pagination: { page: number; limit: number; total: number; pages: number };
  }> {
    const response = await api.get("/attendance/history", { params });
    return unwrap(response.data);
  },

  async getAttendanceStats(): Promise<AttendanceStats> {
    const response = await api.get("/attendance/history?limit=1");
    return unwrap(response.data)?.stats ?? { totalAttendance: 0, byMethod: [] };
  },

  // Add to studentService object:

  async registerDevice(
    deviceId: string,
    deviceName: string,
    publicKey: string,
  ): Promise<void> {
    await api.post("/biometric/register-device", {
      deviceId,
      deviceName,
      publicKey,
    });
  },

  async getBiometricChallenge(
    deviceId: string,
  ): Promise<{ challenge: string; expiresAt: string }> {
    const response = await api.get("/biometric/challenge", {
      params: { deviceId },
    });
    return unwrap(response.data);
  },

  async syncOfflineRecords(records: any[]): Promise<void> {
    await api.post("/offline/sync", { records });
  },
};
