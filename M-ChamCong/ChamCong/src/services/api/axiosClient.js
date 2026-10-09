import axios from "axios";
import { getAuth, clearAuth } from "../auth/auth";
import { API_BASE_URL } from "./apiConfig";

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Đính kèm token khi đã đăng nhập (lưu trong marixa_auth)
axiosClient.interceptors.request.use((config) => {
    const token = getAuth()?.token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Token hết hạn / bị thu hồi (401) -> xoá phiên cũ, đưa về trang đăng nhập.
// Tránh cảnh 20+ request đồng loạt trả 401 làm tràn log "Failed to load resource".
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const auth = getAuth();
    // Chỉ xoá phiên khi đang giữ token (không quăng khách chưa đăng nhập về /login)
    if (status === 401 && auth?.token && !window.location.pathname.startsWith("/login")) {
      clearAuth();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosClient;
