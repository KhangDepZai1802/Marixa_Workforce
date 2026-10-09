import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage, translate } from "../../../services/i18n/LanguageProvider";

const COLLAPSE_KEY = "marixa_work_sidebar_collapsed";

// Sidebar khu "Công việc": 4 mục (Tổng quan / Việc của tôi / Báo cáo / Hiệu suất) + tìm kiếm.
// Active state đọc từ query param ?tab= (đồng bộ với WorkPage).
const WorkSidebar = ({ collapsed, search, setSearch }) => {
    const { language } = useLanguage();
    const L = (t) => translate(t, language);
    const navigate = useNavigate();
    const { search: qs } = useLocation();
    const activeTab = new URLSearchParams(qs).get("tab") || "overview";

    const items = [
        { tab: "overview", label: L("Tổng quan"), icon: "▦" },
        { tab: "tasks", label: L("Việc của tôi"), icon: "☰" },
        { tab: "projects", label: L("Dự án"), icon: "◈" },
        { tab: "reports", label: L("Tiến độ"), icon: "▤" },
        { tab: "performance", label: L("Hiệu suất"), icon: "✦" },
    ];

    return (
        <aside className={`work-sidebar att-sidebar${collapsed ? " collapsed" : ""}`}>
            <div className="work-sidebar-inner">
                <label className="work-search">
                    <span aria-hidden="true">⌕</span>
                    <input
                        type="search"
                        placeholder={L("Tìm việc / báo cáo...")}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        aria-label={L("Tìm trong công việc")}
                    />
                </label>
                <nav className="att-sidebar-nav">
                    {items.map((item) => (
                        <button
                            key={item.tab}
                            type="button"
                            title={collapsed ? item.label : undefined}
                            className={`att-nav-item work-nav-item${activeTab === item.tab ? " active" : ""}`}
                            onClick={() => navigate(`/work?tab=${item.tab}`)}
                        >
                            <span className="work-nav-ico" aria-hidden="true">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="work-back-wrap">
                    <button
                        type="button"
                        className="work-back-btn"
                        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/home"))}
                    >
                        <span aria-hidden="true">←</span> {L("Quay lại")}
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default WorkSidebar;
