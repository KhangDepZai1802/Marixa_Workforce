"use client";

import { ChangePasswordButton } from "@/components/change-password";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Dialog } from "@/components/dialog";

type Item = { href: string; label: string; icon?: string };
const paths: Record<string, string> = {
  camera: "M3 7h5l2-3h4l2 3h5v14H3zM16 14a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  home: "M3 10 12 3l9 7M5 9v12h14V9M9 21v-7h6v7",
  calendar: "M5 5h14v16H5zM8 3v4m8-4v4M5 10h14M8 14h2m4 0h2m-8 3h2",
  people: "M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2",
  leave: "M5 4h14v17H5zM8 8h8m-8 4h8m-8 4h5",
  more: "M4 6h16M4 12h16M4 18h16",
};
function Icon({ name = "more" }: { name?: string }) { return <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] ?? paths.more} /></svg>; }
export function MobileNavigation({ role, items }: { role: "employee" | "hr" | "admin"; items: Item[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const staffArea = pathname.startsWith("/hr") || pathname.startsWith("/admin");
  const personal: Item[] = [{ href: "/home", label: "Trang chủ", icon: "home" }, { href: "/my-attendance", label: "Lịch công", icon: "calendar" }, { href: "/today", label: "Chấm công", icon: "camera" }, { href: "/my-requests", label: "Nghỉ phép", icon: "leave" }, { href: "/my-profile", label: "Tài khoản", icon: "people" }];
  const staff: Item[] = [{ href: "/hr/employees", label: "Nhân viên", icon: "people" }, { href: "/hr/attendance", label: "Duyệt công", icon: "calendar" }, { href: "/hr/timesheets", label: "Bảng công", icon: "calendar" }, { href: "/hr/requests", label: "Duyệt đơn", icon: "leave" }];
  const admin: Item[] = [{ href: "/admin", label: "Tổng quan", icon: "home" }, { href: "/admin/accounts", label: "Tài khoản", icon: "people" }, { href: "/admin/audit", label: "Nhật ký", icon: "leave" }, { href: "/admin/settings", label: "Cấu hình", icon: "more" }];
  const primary = staffArea && role !== "employee" ? pathname.startsWith("/admin") && role === "admin" ? admin : staff : personal;
  return <>
    {pathname === "/my-profile" && <button type="button" className="mobile-profile-more" aria-expanded={open} onClick={() => setOpen(true)}>Các chức năng khác ›</button>}
    <nav className="mobile-bottom-nav" aria-label="Điều hướng điện thoại">{primary.map(item => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`mobile-nav-item${item.icon === "camera" ? " mobile-nav-camera" : ""}${pathname === item.href ? " is-active" : ""}`}><Icon name={item.icon} /><span>{item.label}</span></Link>)}{primary !== personal && <button type="button" className={`mobile-nav-item ${open ? "is-active" : ""}`} aria-expanded={open} onClick={() => setOpen(true)}><Icon /><span>Thêm</span></button>}</nav>
    {open && <Dialog title={staffArea ? "Chức năng" : "Tài khoản & chức năng"} className="mobile-more-sheet" onClose={() => setOpen(false)}><div className="mobile-more-links">{[{ href: "/home", label: "Trang chủ" }, ...items].map(item => <Link key={item.href} href={item.href} className={pathname === item.href ? "is-active" : ""} onClick={() => setOpen(false)}><Icon /><span>{item.label}</span><span aria-hidden="true">›</span></Link>)}<ChangePasswordButton onClick={() => setOpen(false)}><Icon /><span>Đổi mật khẩu</span><span aria-hidden="true">›</span></ChangePasswordButton></div></Dialog>}
  </>;
}
