"use client";
import { MonthSummary } from "@/features/attendance/month-summary";

import { businessDate } from "@/lib/format";
import Link from "next/link";
import { OperationsPanel } from "@/features/operations/operations-panel";
import { useEffect, useState } from "react";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { LoadingState, Notice, PageHeader, Panel, StatCard } from "@/components/ui";
import { VnClock } from "@/components/vn-clock";

type Overview = { active_employees: number; checked_in: number; not_checked_in: number; late: number; outside_office: number; unresolved_evidence_or_sync: number; pending_requests: number; pending_prior_period_adjustments: number };
const links = [{ href: "/admin/accounts", title: "Tài khoản", detail: "Cấp tài khoản, đổi vai trò, khóa và đặt lại mật khẩu." }, { href: "/admin/settings", title: "Cấu hình hệ thống", detail: "Chính sách làm việc, lịch nghỉ, phép và vị trí tham khảo." }, { href: "/admin/audit", title: "Nhật ký hoạt động", detail: "Theo dõi thay đổi nghiệp vụ và thao tác quản trị." }, { href: "/hr/timesheets", title: "Kỳ bảng công", detail: "HR đối soát; admin là người khóa hoặc mở lại kỳ." }];

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { apiRequest<ApiEnvelope<Overview>>("/api/v1/hr/dashboard").then(result => setData(result.data)).catch(cause => setError(cause instanceof ApiError ? cause.message : "Không tải được tổng quan.")).finally(() => setLoading(false)); }, []);
  return <>
    <PageHeader title="Trang chủ" description="Chọn chức năng để quản lý" />
    <div className="admhome"><VnClock /><div className="admhome-grid">{[
      { href: "/hr/employees", icon: "👥", label: "Nhân sự", detail: "Hồ sơ nhân viên" },
      { href: "/hr/attendance", icon: "⏱️", label: "Chấm công", detail: "Lịch sử & đối soát công" },
      { href: "/hr/timesheets", icon: "📊", label: "Bảng công", detail: "Theo dõi công theo tháng" },
      { href: "/hr/requests", icon: "🌴", label: "Duyệt đơn", detail: "Phép, tăng ca & sửa công" },
      { href: "/hr/reports", icon: "📑", label: "Báo cáo", detail: "Xuất bảng công" },
      { href: "/admin/accounts", icon: "🔑", label: "Tài khoản", detail: "Cấp và quản lý quyền" },
      { href: "/admin/leave-balances", icon: "▤", label: "Sổ phép", detail: "Giao dịch phép năm" },
      { href: "/admin/settings", icon: "⚙", label: "Cấu hình", detail: "Ca làm & chính sách" },
      { href: "/admin/audit", icon: "◷", label: "Nhật ký", detail: "Theo dõi hoạt động" },
    ].map(item => <Link href={item.href} key={item.href} className="admhome-tile"><span className="admhome-tile-ico" aria-hidden="true">{item.icon}</span><span className="admhome-tile-label">{item.label}</span><span className="admhome-tile-sub">{item.detail}</span></Link>)}</div></div>
    {error && <Notice kind="error">{error}</Notice>}
    {loading ? <LoadingState /> : data && <div className="stats-grid stats-grid-three"><StatCard label="Nhân viên hoạt động" value={data.active_employees} /><StatCard label="Đơn chờ HR xử lý" value={data.pending_requests} tone="gold" /><StatCard label="Điều chỉnh kỳ trước" value={data.pending_prior_period_adjustments} tone="cyan" /></div>}
    <MonthSummary month={businessDate().slice(0, 7)} scope="all" />
    <OperationsPanel />
    <Panel title="Công cụ quản trị" description="Một số thao tác ảnh hưởng toàn hệ thống; chúng được ghi audit ở API.">
      <div className="quick-links">{links.map(item => <Link href={item.href} key={item.href}><span><strong>{item.title}</strong><small>{item.detail}</small></span><b>›</b></Link>)}</div>
    </Panel>
  </>;
}
