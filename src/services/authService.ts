import { api } from "./api";

export interface User {
  _id: string;
  fullName: string;
  matricNumber: string;
  email: string;
  role: string;
  department: string;
  level: number;
}

// Simple in-memory storage for testing
let memoryToken: string | null = null;

export const authService = {
  async login(
    emailOrMatric: string,
    password: string,
  ): Promise<{ user: User; accessToken: string }> {
    console.log("Attempting login with:", emailOrMatric);

    const response = await api.post("/auth/login", { emailOrMatric, password });
    console.log("Login response:", response.data);

    const data = response.data?.data;
    const user = data.user;
    const accessToken = data.tokens?.accessToken;

    if (accessToken) {
      memoryToken = accessToken;
      console.log("Token saved in memory");
    }

    return { user, accessToken };
  },

  getToken(): string | null {
    return memoryToken;
  },

  async getMe(): Promise<User> {
    const response = await api.get("/auth/me");
    return response.data?.data;
  },

  async logout(): Promise<void> {
    memoryToken = null;
  },
};
