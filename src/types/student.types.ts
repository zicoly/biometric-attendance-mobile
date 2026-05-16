export interface User {
  _id: string;
  fullName: string;
  matricNumber: string;
  email: string;
  role: string;
  department: string;
  level: number;
}

export interface Course {
  _id: string;
  courseCode: string;
  courseTitle: string;
  creditUnits: number;
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
  hasMarked?: boolean;
}
