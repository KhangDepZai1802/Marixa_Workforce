import { NavLink } from "react-router-dom";

const HR_NAV_ITEMS = [
    { to: "/employees", label: "Danh sách" },
    { to: "/employees/attendance-history", label: "Duyệt công" },
    { to: "/employees/statistics", label: "Thống kê công" },
    { to: "/employees/work-schedule", label: "Lịch làm" },
    { to: "/employees/contracts", label: "Hợp đồng" },
    { to: "/employees/leaves", label: "Duyệt nghỉ phép" },
    { to: "/employees/handover", label: "Bàn giao" },
    { to: "/employees/reports", label: "Báo cáo" },
    { to: "/employees/accounts", label: "Cấp tài khoản" },
    { to: "/employees/promotions", label: "Thăng chức" },
];

const HrSidebar = ({ collapsed }) => (
    <aside className={`att-sidebar${collapsed ? " collapsed" : ""}`}>
        <nav className="att-sidebar-nav" aria-label="Điều hướng nhân sự">
            {HR_NAV_ITEMS.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === "/employees"}
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

export default HrSidebar;
