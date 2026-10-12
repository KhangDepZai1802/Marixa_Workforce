"use client";

import { ChangePasswordButton } from "@/components/change-password";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Dialog } from "@/components/dialog";
import { Icon } from "@/components/icon";
import { isNavActive, type NavItem, type Role } from "@/lib/navigation";

export function MobileNavigation({ role, items }: { role: Role; items: NavItem[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const destinations = role === "employee"
    ? ["/home", "/today", "/my-attendance", "/my-requests"]
    : role === "hr" ? ["/home", "/today", "/hr/requests", "/hr/timesheets"]
    : ["/home", "/hr/requests", "/hr/timesheets", "/admin/accounts"];
  const labels: Record<string, string> = { "/my-attendance": "Lịch công", "/my-requests": "Đơn từ" };
  const primary = destinations.flatMap(href => items.filter(item => item.href === href));
  const moreActive = !primary.some(item => isNavActive(pathname, item.href));
  return <>
    <nav className="mobile-bottom-nav" aria-label="Điều hướng điện thoại">
      {primary.map(item => <Link key={item.href} href={item.href} aria-current={isNavActive(pathname, item.href) ? "page" : undefined} className={`mobile-nav-item ${isNavActive(pathname, item.href) ? "is-active" : ""}`}><Icon name={item.icon} /><span>{labels[item.href] ?? item.label}</span></Link>)}
      <button type="button" className={`mobile-nav-item ${open || moreActive ? "is-active" : ""}`} aria-expanded={open} onClick={() => setOpen(true)}><Icon name="menu" /><span>Thêm</span></button>
    </nav>
    {open && <Dialog title="Tất cả chức năng" className="mobile-more-sheet" onClose={() => setOpen(false)}>
      <nav className="mobile-more-links" aria-label="Tất cả chức năng">
        {items.map((item, index) => <div key={item.href}>{item.group && item.group !== items[index - 1]?.group && <p className="nav-group-label">{item.group}</p>}<Link href={item.href} aria-current={isNavActive(pathname, item.href) ? "page" : undefined} className={isNavActive(pathname, item.href) ? "is-active" : ""} onClick={() => setOpen(false)}><Icon name={item.icon} /><span>{item.label}</span></Link></div>)}
        <ChangePasswordButton onClick={() => setOpen(false)}><Icon name="shield" /><span>Đổi mật khẩu</span></ChangePasswordButton>
      </nav>
    </Dialog>}
  </>;
}
