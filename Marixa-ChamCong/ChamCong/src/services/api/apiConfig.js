// API_BASE_URL:
// - Có VITE_API_BASE_URL (dev/local hoặc static host) -> dùng giá trị tuyệt đối.
// - Không có (build chạy CÙNG domain với API, ví dụ M.API/wwwroot serve sẵn)
//   -> dùng "/api" tương đối, cùng origin, không cần CORS.
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "/api";
