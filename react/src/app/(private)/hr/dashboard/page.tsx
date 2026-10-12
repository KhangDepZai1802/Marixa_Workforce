"use client";
import Link from "next/link";
import { MonthSummary } from "@/features/attendance/month-summary";
import { StaffTasks, type StaffOverview } from "@/features/workspace/workspace-home";
import { useResource } from "@/lib/use-resource";
import { Button, LoadingState, Notice, PageHeader, Panel, StatCard } from "@/components/ui";
import { businessDate, formatDate } from "@/lib/format";

export default function HrDashboardPage() {
  const { data, loading, error, reload } = useResource<StaffOverview>("/api/v1/hr/dashboard");
  return <>
    <PageHeader title="Tổng quan nhân sự" description={"Chấm công và yêu cầu ngày " + formatDate(data?.date ?? businessDate())} action={<Button variant="secondary" onClick={reload} disabled={loading}>Làm mới</Button>} />
    {loading ? <LoadingState /> : error ? <Notice kind="error">{error} <Button variant="secondary" onClick={reload}>Thử lại</Button></Notice> : data && <>
      <StaffTasks data={data} />
      <div className="stats-grid"><StatCard label="Nhân viên đang làm việc" value={data.active_employees} /><StatCard label="Đã chấm vào" value={data.checked_in} /><StatCard label="Chưa chấm vào" value={data.not_checked_in} detail="Theo lịch làm và phép đã duyệt" /><StatCard label="Đi trễ" value={data.late} detail="Theo ca đang có hiệu lực" /></div>
      <MonthSummary month={businessDate().slice(0, 7)} scope="all" />
      <Panel title="Tra cứu"><div className="quick-links"><Link href="/hr/employees"><span><strong>Nhân viên</strong><small>Thông tin liên hệ và công việc</small></span><b>›</b></Link><Link href="/hr/leave-balances"><span><strong>Sổ phép</strong><small>Số dư và giao dịch phép theo năm</small></span><b>›</b></Link><Link href="/hr/reports"><span><strong>Báo cáo</strong><small>Xuất bảng công từ phiên bản đã tổng hợp</small></span><b>›</b></Link></div></Panel>
    </>}
  </>;
}
