import { API_BASE_URL } from "../services/api/apiConfig";

// Ảnh chấm công: CSDL lưu đường dẫn TƯƠNG ĐỐI (/uploads/attendance/...)
// do API serve (static files). Frontend chạy riêng (dev :5173) nên phải
// ghép với origin của API để trình duyệt tải đúng ảnh.
const API_ORIGIN = (() => {
    try {
        return new URL(API_BASE_URL).origin;
    } catch {
        // Base URL tương đối (deploy cùng origin) -> dùng origin hiện tại
        return window.location.origin;
    }
})();

// Biến ảnh từ CSDL (tương đối hoặc legacy absolute) thành URL tải được.
export const resolvePhotoUrl = (url) => {
    if (!url) return null;
    if (/^https?:\/\//i.test(url)) return url; // legacy/external: giữ nguyên
    const p = url.startsWith("/") ? url : `/${url}`;
    return `${API_ORIGIN}${p}`;
};
