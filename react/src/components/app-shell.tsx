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
import { Icon } from "@/components/icon";
import { isNavActive, navItems, roleLabels, type Role } from "@/lib/navigation";

type ShellProfile = { employee: { full_name: string; employee_code: string } | null };

export function AppShell({ role, employeeId, children }: { role: Role; employeeId: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [profile, setProfile] = useState<ShellProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const accountRef = useRef<HTMLDivElement>(null);
  const visible = navItems.filter(item => item.roles.includes(role));
  useEffect(() => {
    let active = true;
    apiRequest<ApiEnvelope<ShellProfile>>("/api/v1/me").then(result => { if (active) setProfile(result.data); }).catch(() => { if (active) setProfile(null); });
    const saved = window.setTimeout(() => {
      try { setCollapsed(localStorage.getItem("marixa_sidebar_collapsed") === "1"); }
      catch { setCollapsed(false); }
    }, 0);
    return () => { active = false; window.clearTimeout(saved); };
  }, []);
  useEffect(() => {
    function close(event: MouseEvent) { if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false); }
    function keyboard(event: KeyboardEvent) { if (event.key === "Escape") setAccountOpen(false); }
    document.addEventListener("mousedown", close); window.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("mousedown", close); window.removeEventListener("keydown", keyboard); };
  }, []);
  function toggleSidebar() {
    setCollapsed(value => {
      try { localStorage.setItem("marixa_sidebar_collapsed", value ? "0" : "1"); }
      catch { /* The menu remains usable when browser storage is unavailable. */ }
      return !value;
    });
  }
  async function signOut() {
    setBusy(true); setError("");
    try {
      if (employeeId) {
        try {
          const pending = await listQueuedAttendance(employeeId);
          if (pending.length && !window.confirm(`Còn ${pending.length} lượt chấm chưa đồng bộ trên thiết bị. Đăng xuất sẽ giữ lượt chấm này tại đây; hãy đăng nhập lại đúng tài khoản để gửi. Tiếp tục đăng xuất?`)) return;
        } catch {
          if (!window.confirm("Không kiểm tra được lượt chấm còn lưu trên thiết bị. Hãy đăng nhập lại đúng tài khoản để kiểm tra. Tiếp tục đăng xuất?")) return;
        }
      }
      await apiRequest("/api/v1/auth/logout", { method: "POST" });
      router.replace("/login"); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không thể đăng xuất."); }
    finally { setBusy(false); }
  }
  const name = profile?.employee?.full_name || roleLabels[role];
  const current = visible.find(item => isNavActive(pathname, item.href));
  return <PasswordDialogProvider><div className={`app-shell ${collapsed ? "sidebar-collapsed" : ""}`}>
    <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
    <header className="app-header">
      <div className="app-header-left">
        <Link href="/home" className="app-header-brand" aria-label="Marixa — Trang chủ"><Image src="/logo.png" width={38} height={38} alt="" priority /><span>MARIXA<small>Chấm công & nhân sự</small></span></Link>
        <button type="button" className="app-header-toggle icon-button" aria-label={collapsed ? "Mở thanh menu" : "Gập thanh menu"} aria-expanded={!collapsed} aria-controls="main-navigation" onClick={toggleSidebar}><Icon name="menu" /></button>
        <div className="header-context"><span>{current?.group || "Không gian làm việc"}</span>{current?.group && <><Icon name="chevron" width={14} height={14} /><strong>{current.label}</strong></>}</div>
      </div>
      <div className="app-header-user" ref={accountRef}>
        <span className="header-role">{roleLabels[role]}</span>
        <NotificationBell key={pathname} role={role} onOpen={() => setAccountOpen(false)} />
        <button type="button" className="app-header-avatar-btn" aria-expanded={accountOpen} aria-controls="account-options" aria-label="Tùy chọn tài khoản" onClick={() => setAccountOpen(open => !open)}>{name.trim().charAt(0).toUpperCase()}</button>
        {accountOpen && <div id="account-options" className="app-header-menu"><div className="app-header-menu-head"><strong>{name}</strong><span>{profile?.employee?.employee_code || roleLabels[role]}</span></div><Link href="/my-profile" onClick={() => setAccountOpen(false)}>Hồ sơ cá nhân</Link><ChangePasswordButton onClick={() => setAccountOpen(false)} /><div className="app-header-menu-sep" /><button type="button" className="danger" disabled={busy} onClick={signOut}>{busy ? "Đang thoát…" : "Đăng xuất"}</button></div>}
      </div>
    </header>
    <div className="shell-body">
      <aside id="main-navigation" className="sidebar"><nav aria-label="Điều hướng chính">
        {visible.map((item, index) => <div key={item.href}>{item.group && item.group !== visible[index - 1]?.group && <p className="nav-group-label">{item.group}</p>}<Link href={item.href} className={`nav-link ${isNavActive(pathname, item.href) ? "nav-link-active" : ""}`} aria-current={isNavActive(pathname, item.href) ? "page" : undefined} title={collapsed ? item.label : undefined}><Icon name={item.icon} /><span>{item.label}</span></Link></div>)}
      </nav><div className="sidebar-footer"><span className="brand-dot" />Marixa · Nội bộ</div></aside>
      <main className="main-content" id="main-content" tabIndex={-1}><div className="page-content">{error && <div className="notice notice-error" role="alert">{error}</div>}{children}</div></main>
    </div>
    <MobileNavigation key={pathname} role={role} items={visible} />
  </div></PasswordDialogProvider>;
}
