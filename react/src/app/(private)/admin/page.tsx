"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { LoadingState, Notice, PageHeader, Panel, StatCard } from "@/components/ui";

type Overview = { active_employees: number; checked_in: number; not_checked_in: number; late: number; outside_office: number; unresolved_evidence_or_sync: number; pending_requests: number; pending_prior_period_adjustments: number };
const links = [{ href: "/admin/accounts", title: "Tài khoản", detail: "Cấp tài khoản, đổi vai trò, khóa và đặt lại mật khẩu." }, { href: "/admin/settings", title: "Cấu hình hệ thống", detail: "Chính sách làm việc, lịch nghỉ, phép và vị trí tham khảo." }, { href: "/admin/audit", title: "Nhật ký hoạt động", detail: "Theo dõi thay đổi nghiệp vụ và thao tác quản trị." }, { href: "/hr/timesheets", title: "Kỳ bảng công", detail: "HR đối soát; admin là người khóa hoặc mở lại kỳ." }];

export default function AdminPage() {
  const [data, setData] = useState<Overview | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { apiRequest<ApiEnvelope<Overview>>("/api/v1/hr/dashboard").then(result => setData(result.data)).catch(cause => setError(cause instanceof ApiError ? cause.message : "Không tải được tổng quan.")).finally(() => setLoading(false)); }, []);
  return <>
    <PageHeader title="Quản trị hệ thống" description="Quản lý quyền truy cập, chính sách vận hành và kiểm soát thay đổi." />
    {error && <Notice kind="error">{error}</Notice>}
    {loading ? <LoadingState /> : data && <div className="stats-grid stats-grid-three"><StatCard label="Nhân viên hoạt động" value={data.active_employees} /><StatCard label="Đơn chờ HR xử lý" value={data.pending_requests} tone="gold" /><StatCard label="Điều chỉnh kỳ trước" value={data.pending_prior_period_adjustments} tone="cyan" /></div>}
    <Panel title="Công cụ quản trị" description="Một số thao tác ảnh hưởng toàn hệ thống; chúng được ghi audit ở API.">
      <div className="quick-links">{links.map(item => <Link href={item.href} key={item.href}><span><strong>{item.title}</strong><small>{item.detail}</small></span><b>›</b></Link>)}</div>
    </Panel>
  </>;
}
