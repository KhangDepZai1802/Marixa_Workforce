import { NavLink } from "react-router-dom";
const ADMIN_NAV_ITEMS = [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/employees", label: "Nhân sự" },
    { to: "/admin/attendance-history", label: "Chấm công" },
    { to: "/employees/work-schedule", label: "Lịch làm" },
    { to: "/admin/statistics", label: "Thống kê công" },
    { to: "/admin/contracts", label: "Hợp đồng" },
    { to: "/admin/reports", label: "Báo cáo" },
    { to: "/admin/work", label: "Công tác" },
    { to: "/admin/roles", label: "Phân quyền" },
    { to: "/admin/block-accounts", label: "Chặn tài khoản" },
    { to: "/admin/accounts", label: "Cấp tài khoản" },
];

const AdminSidebar = ({ collapsed }) => {
    return (
        <aside className={`att-sidebar${collapsed ? " collapsed" : ""}`}>
            <nav className="att-sidebar-nav" aria-label="Điều hướng quản trị">
                {ADMIN_NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === "/admin"}
                        title={collapsed ? item.label : undefined}
                        className={({ isActive }) =>
                            `att-nav-item${isActive ? " active" : ""}`
                        }
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </aside>
    );
};

export default AdminSidebar;
