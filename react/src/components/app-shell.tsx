"use client";

import { ChangePasswordButton, PasswordDialogProvider } from "@/components/change-password";
import Link from "next/link";
import Image from "next/image";
import { listQueuedAttendance } from "@/features/attendance/offline-queue";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { NotificationBell } from "@/components/notification-bell";
import { MobileNavigation } from "@/components/mobile-navigation";

type Role = "employee" | "hr" | "admin";
type NavItem = { href: string; label: string; roles: Role[] };
const everyone: Role[] = ["employee", "hr", "admin"];
const staff: Role[] = ["hr", "admin"];
const navItems: NavItem[] = [
  { href: "/today", label: "Chấm công", roles: everyone },
  { href: "/my-attendance", label: "Lịch sử chấm công", roles: everyone },
  { href: "/my-requests", label: "Nghỉ phép và yêu cầu", roles: everyone },
  { href: "/my-profile", label: "Hồ sơ cá nhân", roles: everyone },
  { href: "/hr/dashboard", label: "Tổng quan nhân sự", roles: staff },
  { href: "/hr/employees", label: "Nhân viên", roles: staff },
  { href: "/hr/attendance", label: "Đối soát chấm công", roles: staff },
  { href: "/hr/requests", label: "Duyệt đơn", roles: staff },
  { href: "/hr/leave-balances", label: "Sổ phép", roles: staff },
  { href: "/hr/timesheets", label: "Bảng công", roles: staff },
  { href: "/hr/reports", label: "Báo cáo", roles: staff },
  { href: "/admin", label: "Dashboard", roles: ["admin"] },
  { href: "/admin/accounts", label: "Tài khoản", roles: ["admin"] },
  { href: "/admin/leave-balances", label: "Sổ phép", roles: ["admin"] },
  { href: "/admin/settings", label: "Cấu hình", roles: ["admin"] },
  { href: "/admin/audit", label: "Nhật ký", roles: ["admin"] },
];
const roleLabels = { employee: "Nhân viên", hr: "Nhân sự", admin: "Quản trị viên" };
type ShellProfile = { employee: { full_name: string; employee_code: string } | null };

export function AppShell({ role, employeeId, children }: { role: Role; employeeId: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profile, setProfile] = useState<ShellProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);
  const visible = navItems.filter(item => item.roles.includes(role));
  const home = pathname === "/home";
  const group = pathname.startsWith("/admin") ? "Quản trị" : pathname.startsWith("/hr") ? "Nhân sự" : pathname === "/my-profile" ? "Hồ sơ cá nhân" : "Chấm công";
  const navigation = visible.filter(item => group === "Quản trị" ? item.href.startsWith("/admin") : group === "Nhân sự" ? item.href.startsWith("/hr") : group === "Hồ sơ cá nhân" ? item.href === "/my-profile" : ["/today", "/my-attendance", "/my-requests"].includes(item.href));
  useEffect(() => {
    let active = true;
    apiRequest<ApiEnvelope<ShellProfile>>("/api/v1/me").then(result => { if (active) setProfile(result.data); }).catch(() => {});
    const saved = window.setTimeout(() => { try { setCollapsed(localStorage.getItem("marixa_sidebar_collapsed") === "1"); } catch {} }, 0);
    return () => { active = false; window.clearTimeout(saved); };
  }, []);
  useEffect(() => {
    function close(event: MouseEvent) { if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false); }
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") { setAccountOpen(false); setMenuOpen(false); }
      if (event.key === "[" && !(event.target as Element)?.closest("input,textarea,select,[contenteditable=true]")) toggleSidebar();
    }
    document.addEventListener("mousedown", close); window.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("mousedown", close); window.removeEventListener("keydown", keyboard); };
  }, []);
  function toggleSidebar() {
    if (window.matchMedia("(max-width: 900px)").matches) setMenuOpen(open => !open);
    else setCollapsed(value => { try { localStorage.setItem("marixa_sidebar_collapsed", value ? "0" : "1"); } catch {} return !value; });
  }
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

  const name = profile?.employee?.full_name || roleLabels[role];
  return <PasswordDialogProvider><div className={`app-shell reference-shell phone-nav-layout ${pathname.startsWith("/hr") || pathname.startsWith("/admin") ? "staff-mobile-layout" : ""} ${home ? "home-shell phone-home-layout is-home" : ""} ${collapsed ? "sidebar-collapsed" : ""}`}>
    <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
    <header className={`topbar app-header ${home ? "app-header--minimal" : ""}`}>
      <div className="app-header-left">
        {!home && <button type="button" className="app-header-toggle" aria-label={collapsed ? "Mở thanh menu" : "Gập thanh menu"} aria-expanded={!collapsed || menuOpen} aria-controls="main-navigation" onClick={toggleSidebar}><span /><span /><span /></button>}
        <Link href="/home" className="app-header-brand"><Image src="/logo.png" width={34} height={34} alt="" priority /><span className="app-header-logo-text">MARIXA</span>{!home && <span className="app-header-slogan">Chấm công &amp; quản lý nhân sự</span>}</Link>
      </div>
      <div className="app-header-user" ref={accountRef}>
        <NotificationBell key={pathname} role={role} onOpen={() => setAccountOpen(false)} />
        <button type="button" className="app-header-avatar-btn" aria-expanded={accountOpen} aria-controls="account-options" aria-label="Tùy chọn tài khoản" onClick={() => setAccountOpen(open => !open)}><span>{name.trim().charAt(0).toUpperCase()}</span></button>
        {accountOpen && <div id="account-options" className="app-header-menu"><div className="app-header-menu-head"><strong>{name}</strong><span>{profile?.employee?.employee_code || roleLabels[role]}</span></div><Link href="/my-profile" onClick={() => setAccountOpen(false)}>Hồ sơ cá nhân</Link><ChangePasswordButton onClick={() => setAccountOpen(false)} /><div className="app-header-menu-sep" /><button type="button" className="danger" disabled={busy} onClick={signOut}>{busy ? "Đang thoát…" : "Đăng xuất"}</button></div>}
      </div>
    </header>
    <div className="shell-body app-body">
      {!home && <aside id="main-navigation" className={`sidebar att-sidebar ${menuOpen ? "sidebar-open" : ""}`}><nav className="att-sidebar-nav" aria-label="Điều hướng chính"><Link href="/home" className="att-nav-item" onClick={() => setMenuOpen(false)}>← Trang chủ</Link><div className="att-sidebar-section-title">{group}</div>{navigation.map(item => { const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href + "/")); return <Link key={item.href} href={item.href} className={`nav-link att-nav-item ${active ? "active nav-link-active" : ""}`} aria-current={active ? "page" : undefined} onClick={() => setMenuOpen(false)}>{item.label}</Link>; })}</nav></aside>}
      <main className="main-content att-main" id="main-content">{error && <div className="notice notice-error" role="alert">{error}</div>}{children}</main>
    </div>
    <MobileNavigation key={pathname} role={role} items={visible} />
  </div></PasswordDialogProvider>;
}
