import { NavLink } from "react-router-dom";
import { visibleModules } from "../../services/auth/permission";

const NAV_ITEMS = visibleModules();

// Route "cha" (có item con trùng prefix, ví dụ /attendance ⊃ /attendance/...)
// phải dùng end để chỉ active đúng trang gốc, tránh 2 pill xanh cùng lúc.
const isParent = (to) =>
    NAV_ITEMS.some((o) => o.to !== to && o.to.startsWith(`${to}/`));

const Sidebar = ({ collapsed }) => {
    return (
        <aside className={`att-sidebar${collapsed ? " collapsed" : ""}`}>
            <nav className="att-sidebar-nav">
                {NAV_ITEMS.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={isParent(item.to)}
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

export default Sidebar;
