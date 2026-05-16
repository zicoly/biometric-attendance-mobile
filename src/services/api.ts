import axios from "axios";
import { authService } from "./authService";

const API_URL = "https://awwal-ams-backend.vercel.app/api";

export const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Add token to requests
api.interceptors.request.use(async (config) => {
  const token = authService.getToken?.() || null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
