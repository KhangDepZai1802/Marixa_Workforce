"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { listQueuedAttendance } from "@/features/attendance/offline-queue";

type Role = "employee" | "hr" | "admin";
type NavItem = { href: string; label: string; roles: Role[] };
const everyone: Role[] = ["employee", "hr", "admin"];
const staff: Role[] = ["hr", "admin"];
const admin: Role[] = ["admin"];
const navItems: NavItem[] = [
  { href: "/today", label: "Chấm công", roles: everyone },
  { href: "/my-attendance", label: "Công của tôi", roles: everyone },
  { href: "/my-requests", label: "Đơn của tôi", roles: everyone },
  { href: "/my-profile", label: "Hồ sơ", roles: everyone },
  { href: "/hr/dashboard", label: "Tổng quan nhân sự", roles: staff },
  { href: "/hr/employees", label: "Nhân viên", roles: staff },
  { href: "/hr/attendance", label: "Đối soát chấm công", roles: staff },
  { href: "/hr/requests", label: "Duyệt đơn", roles: staff },
  { href: "/hr/leave-balances", label: "Sổ phép", roles: staff },
  { href: "/hr/timesheets", label: "Bảng công", roles: staff },
  { href: "/hr/reports", label: "Báo cáo", roles: staff },
  { href: "/admin", label: "Quản trị", roles: admin },
  { href: "/admin/accounts", label: "Tài khoản", roles: admin },
  { href: "/admin/leave-balances", label: "Sổ phép", roles: admin },
  { href: "/admin/settings", label: "Cấu hình", roles: admin },
  { href: "/admin/audit", label: "Nhật ký", roles: admin },
];
const roleLabels: Record<Role, string> = { employee: "Nhân viên", hr: "Nhân sự", admin: "Quản trị viên" };
const mobileNavItems = navItems.slice(0, 4);

export function AppShell({ role, employeeId, children }: { role: Role; employeeId: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const visible = navItems.filter((item) => item.roles.includes(role));

  async function signOut() {
    setBusy(true);
    setError("");
    try {
      if (employeeId) {
        try {
          const pending = await listQueuedAttendance(employeeId);
          if (pending.length && !window.confirm(`Còn ${pending.length} lượt chấm chưa đồng bộ trên thiết bị. Đăng xuất sẽ giữ lượt chấm này tại đây; hãy đăng nhập lại đúng tài khoản để gửi. Tiếp tục đăng xuất?`)) return;
        } catch {
          if (!window.confirm("Không kiểm tra được lượt chấm còn lưu trên thiết bị. Đăng xuất có thể làm chậm đồng bộ; hãy đăng nhập lại đúng tài khoản để kiểm tra. Tiếp tục?")) return;
        }
      }
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
      router.replace("/login");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đăng xuất.");
    } finally {
      setBusy(false);
    }
  }

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
    <header className="topbar">
      <Link href="/today" className="brand" aria-label="Marixa Workforce — trang chấm công">
        <Image src="/logo.png" width={42} height={42} alt="" priority />
        <span><strong>MARIXA</strong><small>WORKFORCE</small></span>
      </Link>
      <div className="topbar-right">
        <span className="role-chip">{roleLabels[role]}</span>
        <button className="button button-ghost signout" type="button" onClick={signOut} disabled={busy}>{busy ? "Đang thoát…" : "Đăng xuất"}</button>
        {role !== "employee" && <button className="mobile-menu-button" type="button" aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen((open) => !open)}>
          <span className="sr-only">{menuOpen ? "Đóng menu" : "Mở menu"}</span><span className="menu-lines" />
        </button>}
      </div>
    </header>
    <div className="shell-body">
      <aside id="main-navigation" className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <p className="nav-label">Không gian làm việc</p>
        <nav aria-label="Điều hướng chính">
          {visible.map((item) => {
            const active = pathname === item.href || (item.href !== "/today" && item.href !== "/admin" && pathname.startsWith(`${item.href}/`));
            return <Link key={item.href} href={item.href} className={`nav-link ${active ? "nav-link-active" : ""}`} aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)}>
              <span className="nav-dot" aria-hidden="true" />{item.label}
            </Link>;
          })}
        </nav>
        <div className="sidebar-foot"><span className="sidebar-status" /> Hệ thống chấm công</div>
      </aside>
      <main className="main-content" id="main-content">
        {error && <div className="notice notice-error" role="alert">{error}</div>}
        {children}
        <footer className="page-footer">Marixa Workforce <span>·</span> Múi giờ nghiệp vụ Asia/Ho_Chi_Minh</footer>
      </main>
    </div>
    <nav className="mobile-bottom-nav" aria-label="Điều hướng nhân viên">
      {mobileNavItems.map((item) => <Link key={item.href} href={item.href} className={`mobile-bottom-link ${pathname === item.href ? "mobile-bottom-link-active" : ""}`} aria-current={pathname === item.href ? "page" : undefined} onClick={() => setMenuOpen(false)}>{item.label}</Link>)}
    </nav>
  </div>;
}
