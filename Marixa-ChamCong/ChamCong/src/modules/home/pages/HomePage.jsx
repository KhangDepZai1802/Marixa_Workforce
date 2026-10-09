import { Link } from "react-router-dom";
import Header from "../../../components/layout/Header";
import { canAccessModule } from "../../../services/auth/permission";
import "../home.css";

const MODULES = [
    { to: "/attendance", icon: "🕗", title: "Chấm công", detail: "Vào ca và ra ca", color: "blue" },
    { to: "/kich-hoat", icon: "🔑", title: "Kích hoạt tài khoản", detail: "Nhập mã kích hoạt để đặt mật khẩu", color: "purple" },
    { to: "/employees", icon: "👥", title: "Nhân sự", detail: "Hồ sơ và danh sách nhân viên", color: "pink" },
    { to: "/admin", icon: "📊", title: "Dashboard", detail: "Điều hành và quản lý hệ thống", color: "teal" },
    { to: "/work", icon: "📋", title: "Công việc", detail: "Tổng quan và việc cần xử lý của bạn", color: "amber" },
];

const HomePage = () => (
    <div className="home-shell">
        <Header minimal />
        <main className="home-main">
            <section className="home-hero">
                <div>
                    <span className="home-eyebrow">MARIXA · PEOPLE OPERATIONS</span>
                    <h1>Mọi công việc trong một không gian.</h1>
                    <p>Chọn module để chấm công, quản lý hồ sơ và theo dõi các nghiệp vụ nhân sự hằng ngày.</p>
                    <Link className="home-cta" to="/attendance">Bắt đầu chấm công <span aria-hidden="true">↗</span></Link>
                </div>
                <div className="home-hero-art" aria-hidden="true"><span>M</span><i /><i /><i /></div>
            </section>

            <section className="home-launcher" aria-labelledby="home-title">
                <div className="home-heading">
                    <div><span className="home-eyebrow">BUSINESS LAUNCHER</span><h2 id="home-title">Không gian làm việc</h2></div>
                    <p>Chọn một module để tiếp tục.</p>
                </div>
                <div className="home-grid">
                    {MODULES.filter((module) => canAccessModule(module.to)).map((module) => (
                        <Link className={`home-card home-card--${module.color}`} to={module.to} key={module.to}>
                            <span className={`home-icon home-icon--${module.color}`} aria-hidden="true">{module.icon}</span>
                            <strong>{module.title}</strong>
                            <span>{module.detail}</span>
                            <span className="home-arrow" aria-hidden="true">↗</span>
                        </Link>
                    ))}
                </div>
            </section>
            <footer className="home-footer"><strong>MARIXA</strong><span>Chấm công &amp; quản lý nhân sự</span></footer>
        </main>
    </div>
);

export default HomePage;
