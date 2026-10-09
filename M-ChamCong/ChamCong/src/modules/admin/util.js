import { getAuth } from "../../services/auth/auth";

// Id người dùng đang đăng nhập (để gán ApprovedBy khi duyệt).
export const currentUserId = () => getAuth()?.employeeId;
