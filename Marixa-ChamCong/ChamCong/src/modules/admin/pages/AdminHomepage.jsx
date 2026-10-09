import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminAppLayout from "../layout/AdminAppLayout";
import "../../../modules/me/attendance.css";
import "../admin.css";
import { localeForLanguage, translate, useLanguage } from "../../../services/i18n/LanguageProvider";

// ===== Đồng hồ giờ Việt Nam (UTC+7) =====
// Lấy "bây giờ" theo giờ VN dù máy chạy ở múi giờ khác.
const vnNow = () => {
    const utc = Date.now() + new Date().getTimezoneOffset() * 60000;
    return new Date(utc + 7 * 3600000);
};

const pad = (n) => String(n).padStart(2, "0");

// 9 chức năng chính trên trang chủ admin (icon + nhãn phụ).
const ICONS = [
    { to: "/admin/employees", icon: "👥", label: "Nhân sự", sub: "Hồ sơ & tuyển mới" },
    { to: "/admin/attendance-history", icon: "⏱️", label: "Chấm công", sub: "Lịch sử & duyệt công" },
    { to: "/admin/statistics", icon: "📊", label: "Thống kê", sub: "Công tác theo tháng" },
    { to: "/admin/contracts", icon: "📄", label: "Hợp đồng", sub: "Ký & theo dõi hạn" },
    { to: "/admin/leaves", icon: "🌴", label: "Nghỉ phép", sub: "Duyệt đơn xin nghỉ" },
    { to: "/admin/payroll", icon: "💰", label: "Lương", sub: "Bảng lương tháng" },
    { to: "/admin/resigned", icon: "📦", label: "Nghỉ việc", sub: "Lưu trữ nhân viên" },
    { to: "/admin/reports", icon: "📑", label: "Báo cáo", sub: "Tổng hợp công việc" },
    { to: "/admin/accounts", icon: "🔑", label: "Cấp tài khoản", sub: "Mã kích hoạt" },
];

const VnClock = () => {
    const [now, setNow] = useState(vnNow());
    const { language } = useLanguage();
    const locale = localeForLanguage(language);
    const L = (text) => translate(text, language);

    useEffect(() => {
        const id = setInterval(() => setNow(vnNow()), 1000);
        return () => clearInterval(id);
    }, []);

    const minuteDeg = (now.getMinutes() / 60) * 360;
    const hourDeg = ((now.getHours() % 12) + now.getMinutes() / 60) * 30;
    const dateLabel = now.toLocaleDateString(locale, {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });

    return (
        <div className="admhome-clock" aria-label="Đồng hồ giờ Việt Nam">
            <div className="admhome-clock-face">
                {/* 12 chấm số giờ */}
                {Array.from({ length: 12 }).map((_, i) => (
                    <span
                        key={i}
                        className="admhome-clock-tick"
                        style={{
                            transform: `rotate(${i * 30}deg) translateY(-34px)`,
                        }}
                    />
                ))}
                <div
                    className="admhome-clock-hand admhome-clock-hand--hour"
                    style={{ transform: `rotate(${hourDeg}deg)` }}
                />
                <div
                    className="admhome-clock-hand admhome-clock-hand--minute"
                    style={{ transform: `rotate(${minuteDeg}deg)` }}
                />
                <div className="admhome-clock-pin" />
            </div>
            <div className="admhome-clock-meta">
                <strong>
                    {pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}
                </strong>
                <span style={{ textTransform: "capitalize" }}>{dateLabel}</span>
                <span className="admhome-clock-tz">{L("Giờ Việt Nam · GMT+7")}</span>
            </div>
        </div>
    );
};

const AdminHomepage = () => {
    const navigate = useNavigate();
    const { language } = useLanguage();
    const L = (text) => translate(text, language);

    return (
        <AdminAppLayout
            title={L("Trang chủ")}
            subtitle={L("Chọn chức năng để quản lý")}
        >
            <div className="att-content">
                <div className="admhome">
                    <div className="admhome-clock-card">
                        <VnClock />
                    </div>

                    <div className="admhome-grid">
                        {ICONS.map((x) => (
                            <button
                                key={x.to}
                                type="button"
                                className="admhome-tile"
                                onClick={() => navigate(x.to)}
                            >
                                <span className="admhome-tile-ico">{x.icon}</span>
                                <span className="admhome-tile-label">{L(x.label)}</span>
                                <span className="admhome-tile-sub">{L(x.sub)}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </AdminAppLayout>
    );
};

export default AdminHomepage;
