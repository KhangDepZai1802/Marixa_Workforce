// ============================================================
// REGISTRY MODULE
// Mỗi module (một đường dẫn) khai báo:
//   - to     : đường dẫn
//   - label  : tên hiển thị trên sidebar
//   - access : cấp quyền chung. "user" = mọi tài khoản đã đăng
//              nhập; "admin" = chỉ những role trong ADMIN_ROLES.
//   - roles  : (tuỳ chọn) danh sách role được phép truy cập,
//              ưu tiên hơn access. Ví dụ: /employees chỉ HR,
//              Manager và Admin.
// Sidebar và route guard đều đọc từ đây -> thống nhất nguồn quyền.
// ============================================================
export const MODULES = [
    { to: "/attendance", label: "Chấm công", access: "user" },
    { to: "/attendance/attendance-history", label: "Lịch sử chấm công", access: "user" },
    { to: "/attendance/attendance-rules", label: "Quy định", access: "user" },
    { to: "/attendance/statistics", label: "Thống kê công", access: "user" },
    { to: "/attendance/leave", label: "Nghỉ phép", access: "user" },
    { to: "/attendance/reports", label: "Báo cáo của tôi", access: "user" },
    { to: "/work", label: "Công việc", access: "user", hideInUserSidebar: true },
    { to: "/attendance/promotions", label: "Đề xuất thăng chức", access: "user" },
    { to: "/attendance/handover", label: "Bàn giao nghỉ việc", access: "user" },
    { to: "/attendance/contracts", label: "Hợp đồng", access: "user" },
    { to: "/attendance/salary", label: "Bảng lương", access: "user" },
    { to: "/attendance/insurance", label: "Bảo hiểm & thuế", access: "user" },
    { to: "/attendance/bank-accounts", label: "Tài khoản ngân hàng", access: "user" },
    { to: "/profile", label: "Hồ sơ", access: "user", hideInUserSidebar: true },
    // Khu quản trị (admin) là một trang riêng, bắt đầu tại dashboard.
    { to: "/admin", label: "Dashboard", access: "admin" },
    // Nhân sự: chỉ HR (Nhân sự), Manager (Quản lý), Admin.
    // hideInUserSidebar: không hiện trong sidebar /attendance (đã có ở sidebar admin).
    {
        to: "/employees",
        label: "Nhân sự",
        roles: ["HR", "Manager", "Admin"],
        hideInUserSidebar: true,
    },
    ...[
        ["attendance-history", "Lịch sử & duyệt công"],
        ["work-schedule", "Lịch làm"],
        ["statistics", "Thống kê công"],
        ["contracts", "Hợp đồng"],
        ["payroll", "Bảng lương"],
        ["leaves", "Duyệt nghỉ phép"],
        ["handover", "Bàn giao"],
        ["reports", "Báo cáo"],
        ["accounts", "Cấp tài khoản"],
        ["promotions", "Thăng chức"],
    ].map(([path, label]) => ({
        to: `/employees/${path}`,
        label,
        roles: ["HR", "Manager", "Admin"],
        hideInUserSidebar: true,
    })),
    { to: "/admin/attendance-history", label: "Chấm công (QL)", access: "admin" },
    { to: "/admin/statistics", label: "Thống kê công (QL)", access: "admin" },
    { to: "/admin/contracts", label: "Hợp đồng", access: "admin" },
    { to: "/admin/leaves", label: "Nghỉ phép", access: "admin" },
    { to: "/admin/payroll", label: "Lương", access: "admin" },
    { to: "/admin/resigned", label: "Nghỉ việc", access: "admin" },
    { to: "/admin/reports", label: "Báo cáo", access: "admin" },
    { to: "/admin/accounts", label: "Cấp tài khoản", access: "admin" },
];

export const moduleByPath = (path) =>
    MODULES.find((m) => m.to === path);
