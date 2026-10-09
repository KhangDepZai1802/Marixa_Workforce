import { useLocation, Link } from "react-router-dom";
import LoginForm from "../components/LoginForm";
import LanguagePicker from "../../../components/layout/LanguagePicker";
import logo from "../../../assets/images/marixa-logo.png";
import "../login.css";

const LoginPage = () => {
    const location = useLocation();
    const activated = location.state?.activated === true;

    return (
        <div className="login-page">
            <LanguagePicker className="lang-picker--corner" />
            <div className="login-brand">
                <div className="login-brand-logo">
                    <img src={logo} alt="MARIXA" />
                    <span>MARIXA</span>
                </div>
                <h2>Hệ thống chấm công &amp; quản lý nhân sự</h2>
                <p>Mọi module. Một hệ thống. Quản lý chấm công, hợp đồng, nghỉ phép và bảng lương của doanh nghiệp trên một nền tảng duy nhất.</p>
                <div className="login-brand-badge">
                    <span className="badge-dot" />
                    Attendance Module
                </div>
            </div>
            <div className="login-content">
                <div className="login-card">
                    <h1>Đăng nhập</h1>
                    <p className="login-subtitle">Vui lòng nhập thông tin tài khoản để tiếp tục</p>
                    {activated && (
                        <div className="activate-success">
                            ✓ Tài khoản đã được kích hoạt. Hãy đăng nhập bằng mật khẩu mới của bạn.
                        </div>
                    )}
                    <LoginForm />
                    <p className="activate-link">
                        Mới nhận mã kích hoạt?{" "}
                        <Link to="/kich-hoat">Kích hoạt tài khoản</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
