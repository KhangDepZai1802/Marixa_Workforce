import { Navigate } from "react-router-dom";
import { canAccessModule } from "../../services/auth/permission";

// Bọc route theo quyền module: thiếu quyền -> chuyển tới trang 403
// (khu vực bạn không có quyền). Tài khoản Admin vẫn vào được mọi
// module vì canAccessModule luôn trả true với role "Admin".
const RequireModule = ({ to, children }) =>
    canAccessModule(to) ? children : <Navigate to="/unauthorized" replace />;

export default RequireModule;
