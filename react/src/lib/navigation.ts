import type { IconName } from "@/components/icon";

export type Role = "employee" | "hr" | "admin";
export type NavItem = { href: string; label: string; icon: IconName; group: string; roles: Role[] };
const everyone: Role[] = ["employee", "hr", "admin"];
const staff: Role[] = ["hr", "admin"];
export const roleLabels = { employee: "Nhân viên", hr: "Nhân sự", admin: "Quản trị viên" };
export const navItems: NavItem[] = [
  { href: "/home", label: "Trang chủ", icon: "home", group: "", roles: everyone },
  { href: "/today", label: "Chấm công", icon: "clock", group: "Cá nhân", roles: everyone },
  { href: "/my-attendance", label: "Lịch sử chấm công", icon: "calendar", group: "Cá nhân", roles: everyone },
  { href: "/my-requests", label: "Đơn từ của tôi", icon: "file", group: "Cá nhân", roles: everyone },
  { href: "/my-profile", label: "Hồ sơ cá nhân", icon: "user", group: "Cá nhân", roles: everyone },
  { href: "/hr/dashboard", label: "Tổng quan nhân sự", icon: "chart", group: "Nhân sự", roles: staff },
  { href: "/hr/employees", label: "Nhân viên", icon: "users", group: "Nhân sự", roles: staff },
  { href: "/hr/attendance", label: "Đối soát chấm công", icon: "review", group: "Nhân sự", roles: staff },
  { href: "/hr/requests", label: "Duyệt đơn", icon: "check", group: "Nhân sự", roles: staff },
  { href: "/hr/timesheets", label: "Bảng công", icon: "calendar", group: "Nhân sự", roles: staff },
  { href: "/hr/leave-balances", label: "Sổ phép", icon: "file", group: "Nhân sự", roles: staff },
  { href: "/hr/reports", label: "Báo cáo", icon: "download", group: "Nhân sự", roles: staff },
  { href: "/admin", label: "Vận hành hệ thống", icon: "shield", group: "Quản trị", roles: ["admin"] },
  { href: "/admin/accounts", label: "Tài khoản", icon: "users", group: "Quản trị", roles: ["admin"] },
  { href: "/admin/settings", label: "Cấu hình", icon: "settings", group: "Quản trị", roles: ["admin"] },
  { href: "/admin/audit", label: "Nhật ký hoạt động", icon: "file", group: "Quản trị", roles: ["admin"] },
];

export function isNavActive(pathname: string, href: string) {
  if (href === "/hr/leave-balances" && pathname === "/admin/leave-balances") return true;
  return pathname === href || (href !== "/admin" && pathname.startsWith(href + "/"));
}
