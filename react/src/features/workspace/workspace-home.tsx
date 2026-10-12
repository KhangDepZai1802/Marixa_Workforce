"use client";

import Link from "next/link";
import { Button, EmptyState, LoadingState, Notice, PageHeader, Panel, StatCard, StatusBadge } from "@/components/ui";
import { Icon } from "@/components/icon";
import { businessDate, formatDate, formatDateTime, formatTime, labelStatus } from "@/lib/format";
import { type Role } from "@/lib/navigation";
import { useResource } from "@/lib/use-resource";

export type StaffOverview = { date: string; active_employees: number; checked_in: number; not_checked_in: number; late: number; outside_office: number; unresolved_evidence_or_sync: number; pending_requests: number; pending_prior_period_adjustments: number; timesheet_period: { id: string; year: number; month: number; status: string; version: number } | null };
type Punch = { id: string; kind: string; occurred_at: string };
type Request = { id: string; status: string; created_at: string; reason: string; work_date?: string; start_date?: string };
type Requests = { leave: Request[]; overtime: Request[]; corrections: Request[] };
type Policy = { start_time: string; end_time: string; lunch_start: string; lunch_end: string };

export function StaffTasks({ data }: { data: StaffOverview }) {
  const period = data.timesheet_period;
  return <Panel title="Việc cần xử lý" description="Mở danh sách để xem chi tiết và ghi nhận quyết định.">
    <div className="quick-links">
      <Link href="/hr/requests"><Icon name="review" /><span><strong>Đơn chờ duyệt</strong><small>Nghỉ phép, tăng ca và sửa công · xử lý theo quyền</small></span><span className="task-count">{data.pending_requests}</span><Icon name="chevron" /></Link>
      <Link href={`/hr/attendance?from=${data.date}&to=${data.date}`}><Icon name="clock" /><span><strong>Chấm công cần kiểm tra hôm nay</strong><small>Đồng bộ muộn hoặc ảnh đang chờ · không tự chặn tính công</small></span><span className="task-count">{data.unresolved_evidence_or_sync}</span><Icon name="chevron" /></Link>
      <Link href="/hr/timesheets?tab=adjustments"><Icon name="calendar" /><span><strong>Điều chỉnh từ kỳ đã khóa</strong><small>Xem chênh lệch trước khi xác nhận</small></span><span className="task-count">{data.pending_prior_period_adjustments}</span><Icon name="chevron" /></Link>
      <Link href={period ? `/hr/timesheets?period=${period.id}` : "/hr/timesheets"}><Icon name="file" /><span><strong>{period ? `Bảng công tháng ${String(period.month).padStart(2, "0")}/${period.year}` : "Tạo kỳ bảng công"}</strong><small>{period ? `${labelStatus(period.status)} · phiên bản ${period.version}` : "Chưa có kỳ công"}</small></span><Icon name="chevron" /></Link>
    </div>
  </Panel>;
}

export function WorkspaceHome({ role, employeeId }: { role: Role; employeeId: string | null }) {
  const today = businessDate();
  const overview = useResource<StaffOverview>(role === "employee" ? null : "/api/v1/hr/dashboard");
  const attendance = useResource<Punch[]>(employeeId ? `/api/v1/me/attendance?from=${today}&to=${today}` : null);
  const requests = useResource<Requests>(employeeId ? "/api/v1/me/requests" : null);
  const policy = useResource<Policy | null>(employeeId ? "/api/v1/me/work-policy" : null);
  const checkIn = attendance.data?.find(row => row.kind === "check_in");
  const checkOut = attendance.data?.find(row => row.kind === "check_out");
  const recent = requests.data ? [
    ...requests.data.leave.map(item => ({ ...item, label: "Nghỉ phép", type: "leave" })),
    ...requests.data.overtime.map(item => ({ ...item, label: "Tăng ca", type: "overtime" })),
    ...requests.data.corrections.map(item => ({ ...item, label: "Sửa công", type: "correction" })),
  ].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5) : [];
  return <div className="workspace-home">
    <PageHeader title="Trang chủ" description={`${formatDate(today)} · ${role === "employee" ? "Công hôm nay và yêu cầu của bạn" : "Tình hình hôm nay và việc đang chờ xử lý"}`} />
    {employeeId && <Panel className="workspace-summary"><div><h2>Công hôm nay</h2>{attendance.loading ? <LoadingState label="Đang tải giờ chấm…" /> : attendance.error ? <Notice kind="error">{attendance.error} <Button variant="secondary" onClick={attendance.reload}>Thử lại</Button></Notice> : <div className="home-punches"><span>Vào ca<strong>{formatTime(checkIn?.occurred_at)}</strong></span><span>Ra ca<strong>{formatTime(checkOut?.occurred_at)}</strong></span></div>}<p>{policy.loading ? "Đang tải ca làm…" : policy.error ? "Chưa tải được ca làm. Bạn vẫn có thể mở trang chấm công." : policy.data ? `Ca chung ${policy.data.start_time.slice(0, 5)}–${policy.data.end_time.slice(0, 5)} · nghỉ ${policy.data.lunch_start.slice(0, 5)}–${policy.data.lunch_end.slice(0, 5)}` : "Chưa có ca hiệu lực hôm nay."}</p><p>Lượt chưa đồng bộ trên thiết bị được xem trong Chấm công.</p></div><Link className="button button-primary" href="/today"><Icon name="clock" />{checkOut ? "Xem công hôm nay" : checkIn ? "Chấm ra" : "Chấm vào"}</Link></Panel>}
    {role !== "employee" && <>
      {overview.loading ? <LoadingState /> : overview.error ? <Notice kind="error">{overview.error} <Button variant="secondary" onClick={overview.reload}>Thử lại</Button></Notice> : overview.data && <><div className="stats-grid"><StatCard label="Nhân viên đang làm việc" value={overview.data.active_employees} /><StatCard label="Đã chấm vào" value={overview.data.checked_in} /><StatCard label="Chưa chấm vào" value={overview.data.not_checked_in} detail="Theo lịch làm và phép đã duyệt" /><StatCard label="Đi trễ hôm nay" value={overview.data.late} detail="Theo ca đang có hiệu lực" /></div><StaffTasks data={overview.data} /></>}
    </>}
    <div className="dashboard-grid">
      {employeeId && <Panel title="Yêu cầu gần đây" action={<Link className="text-button" href="/my-requests">Xem tất cả</Link>}>
        {requests.loading ? <LoadingState /> : requests.error ? <Notice kind="error">{requests.error} <Button variant="secondary" onClick={requests.reload}>Thử lại</Button></Notice> : recent.length ? <div className="quick-links">{recent.map(item => <Link key={item.id} href={`/my-requests?tab=${item.type}`}><span><strong>{item.label} · {formatDate(item.start_date ?? item.work_date)}</strong><small>Gửi {formatDateTime(item.created_at)}</small></span><StatusBadge value={item.status} /></Link>)}</div> : <><EmptyState title="Bạn chưa có yêu cầu nào" description="Tạo đơn nghỉ phép, đăng ký tăng ca hoặc đề nghị sửa giờ chấm." /><Link className="button button-secondary" href="/my-requests">Tạo yêu cầu</Link></>}
      </Panel>}
      <Panel title="Truy cập nhanh"><div className="quick-links">
        {employeeId && <Link href="/my-attendance"><Icon name="calendar" /><span><strong>Lịch sử chấm công</strong><small>Giờ vào, giờ ra và tổng hợp theo tháng</small></span><Icon name="chevron" /></Link>}
        {role !== "employee" && <Link href="/hr/employees"><Icon name="users" /><span><strong>Danh sách nhân viên</strong><small>Hồ sơ và thông tin công việc</small></span><Icon name="chevron" /></Link>}
        {role === "admin" && <Link href="/admin"><Icon name="shield" /><span><strong>Vận hành hệ thống</strong><small>Tài khoản, dung lượng và tác vụ định kỳ</small></span><Icon name="chevron" /></Link>}
        <Link href="/my-profile"><Icon name="user" /><span><strong>Hồ sơ cá nhân</strong><small>Thông tin tài khoản và đổi mật khẩu</small></span><Icon name="chevron" /></Link>
      </div></Panel>
    </div>
  </div>;
}
