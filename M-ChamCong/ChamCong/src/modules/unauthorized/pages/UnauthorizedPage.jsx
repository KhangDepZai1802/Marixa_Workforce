import { useNavigate } from "react-router-dom";
import { clearAuth } from "../../../services/auth/auth";
import logo from "../../../assets/images/marixa-logo.png";
import "./unauthorized.css";

// Trang "Không có quyền" (403): hiện khi tài khoản không đủ quyền
// truy cập module (vd nhân viên thường mở /employees, /admin).
const UnauthorizedPage = () => {
    const navigate = useNavigate();

    const logout = () => {
        clearAuth();
        navigate("/login", { replace: true });
    };

    return (
        <div className="unauth-page">
            <div className="unauth-brand">
                <div className="unauth-brand-logo">
                    <img src={logo} alt="MARIXA" />
                    <span>MARIXA</span>
                </div>
                <h2>Chấm công &amp; quản lý nhân sự</h2>
                <p>
                    Khu vực bạn vừa mở được bảo vệ theo phân quyền. Tài khoản
                    hiện tại chưa thuộc bộ phận có quyền truy cập phân hệ này.
                </p>
                <div className="unauth-brand-badge">
                    <span className="badge-dot" />
                    Phân quyền nội bộ
                </div>
            </div>

            <div className="unauth-content">
                <div className="unauth-card">
                    <span className="unauth-code">403</span>
                    <h1>Bạn không có quyền vào khu vực này</h1>
                    <p className="unauth-desc">
                        Phân hệ bạn vừa mở thuộc quyền quản lý của bộ phận
                        khác (Nhân sự / Điều hành). Nếu đây là nhầm lẫn trong
                        phân quyền, vui lòng liên hệ Quản trị hệ thống.
                    </p>

                    <div className="unauth-actions">
                        <a
                            className="unauth-btn unauth-btn--ghost"
                            href="tel:0908779585"
                        >
                            Gọi Quản trị hệ thống · 0908 779 585
                        </a>
                        <button
                            type="button"
                            className="unauth-btn unauth-btn--primary"
                            onClick={() => navigate("/home", { replace: true })}
                        >
                            Về phân hệ của tôi
                        </button>
                        <button
                            type="button"
                            className="unauth-btn unauth-btn--danger"
                            onClick={logout}
                        >
                            Đăng xuất
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnauthorizedPage;
