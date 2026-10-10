import Link from "next/link";
import { getActor } from "@/lib/auth";

export default async function HomePage() {
  const actor = await getActor();
  const modules = [
    { href: "/today", icon: "◷", title: "Chấm công", detail: "Vào / ra ca và theo dõi lịch sử chấm công", color: "blue" },
    { href: "/my-requests", icon: "▤", title: "Nghỉ phép & yêu cầu", detail: "Đơn nghỉ phép, tăng ca và đề nghị sửa công", color: "blue" },
    { href: "/my-profile", icon: "♙", title: "Hồ sơ cá nhân", detail: "Thông tin nhân viên và tài khoản của bạn", color: "blue" },
    ...(actor?.role === "hr" || actor?.role === "admin" ? [{ href: "/hr/dashboard", icon: "♙", title: "Nhân sự", detail: "Hồ sơ nhân viên, duyệt đơn và bảng công", color: "pink" }] : []),
    ...(actor?.role === "admin" ? [{ href: "/admin", icon: "▦", title: "Dashboard", detail: "Điều hành và quản lý hệ thống", color: "blue" }] : []),
  ];
  return <div className="home-main">
    <section className="home-hero"><div><span className="home-eyebrow">MARIXA · PEOPLE OPERATIONS</span><h1>Mọi công việc trong một không gian.</h1><p>Chọn khu vực làm việc bên dưới. Các chức năng chi tiết nằm trong menu của từng trang.</p></div><div className="home-hero-art" aria-hidden="true"><span>M</span><i /><i /><i /></div></section>
    <section className="home-launcher" aria-labelledby="home-title"><div className="home-heading"><div><span className="home-eyebrow">MARIXA</span><h2 id="home-title">Không gian làm việc</h2></div><p>Truy cập nhanh các khu vực chính.</p></div><div className="home-grid">{modules.map(item => <Link href={item.href} key={item.href} className="home-card"><span className={`home-icon home-icon--${item.color}`} aria-hidden="true">{item.icon}</span><strong>{item.title}</strong><span>{item.detail}</span><span className="home-arrow" aria-hidden="true">↗</span></Link>)}</div></section>
    <footer className="home-footer"><strong>MARIXA</strong><span>Chấm công &amp; quản lý nhân sự</span></footer>
  </div>;
}
