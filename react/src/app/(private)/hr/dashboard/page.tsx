"use client";
import { MonthSummary } from "@/features/attendance/month-summary";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader, Panel, StatCard, LoadingState, Notice, Button } from "@/components/ui";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { businessDate, formatDate } from "@/lib/format";

type Dashboard = { date: string; active_employees: number; checked_in: number; not_checked_in: number; late: number; outside_office: number; unresolved_evidence_or_sync: number; pending_requests: number; pending_prior_period_adjustments: number; timesheet_period: { id: string; year: number; month: number; status: string; version: number } | null };

export default function HrDashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    try { const result = await apiRequest<ApiEnvelope<Dashboard>>("/api/v1/hr/dashboard"); setError(""); setData(result.data); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không tải được dashboard nhân sự."); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    let active = true;
    apiRequest<ApiEnvelope<Dashboard>>("/api/v1/hr/dashboard")
      .then(result => { if (active) { setError(""); setData(result.data); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof ApiError ? cause.message : "Không tải được dashboard nhân sự."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <>
    <PageHeader title="Tổng quan nhân sự" description={data ? "Tình hình chấm công ngày " + formatDate(data.date) : "Theo dõi nhanh hoạt động chấm công và đơn cần xử lý."} action={<Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>Làm mới</Button>} />
    {error && <Notice kind="error">{error}</Notice>}
    {loading && !data ? <LoadingState /> : data ? <>
      <div className="stats-grid">
        <StatCard label="Nhân viên hoạt động" value={data.active_employees} detail="Hồ sơ đang làm việc" />
        <StatCard label="Đã chấm vào" value={data.checked_in} detail={formatDate(businessDate())} tone="cyan" />
        <StatCard label="Chưa chấm vào" value={data.not_checked_in} detail="Theo lịch làm và phép đã duyệt" tone="gold" />
        <StatCard label="Đi trễ" value={data.late} detail="Theo giờ bắt đầu và thời gian ân hạn" tone="green" />
      </div>
      <div className="stats-grid stats-grid-three">
        <StatCard label="Đơn chờ xử lý" value={data.pending_requests} detail="Phép, tăng ca và sửa công" />
        <StatCard label="Cần đối soát" value={data.unresolved_evidence_or_sync} detail="Đồng bộ muộn hoặc ảnh đang tải" tone="gold" />
        <StatCard label="Điều chỉnh kỳ trước" value={data.pending_prior_period_adjustments} detail="Đang chờ HR đối soát" tone="cyan" />
      </div>
      <MonthSummary month={businessDate().slice(0, 7)} scope="all" />
      <div className="dashboard-grid">
        <Panel title="Việc cần xử lý" description="Mở đúng màn hình để xem dữ liệu và ghi nhận quyết định.">
          <div className="quick-links">
            <Link href="/hr/requests"><span><strong>Duyệt đơn</strong><small>{data.pending_requests} yêu cầu đang chờ</small></span><b>›</b></Link>
            <Link href="/hr/attendance"><span><strong>Đối soát chấm công</strong><small>{data.unresolved_evidence_or_sync} lượt cần chú ý</small></span><b>›</b></Link>
            <Link href="/hr/timesheets"><span><strong>Kỳ bảng công</strong><small>{data.timesheet_period ? ("Tháng " + String(data.timesheet_period.month).padStart(2, "0") + "/" + data.timesheet_period.year + " · " + data.timesheet_period.status) : "Chưa tạo kỳ công"}</small></span><b>›</b></Link>
          </div>
        </Panel>
        <Panel title="Ghi chú vận hành" description="Các cờ vị trí và bằng chứng chỉ hỗ trợ HR đối soát.">
          <ul className="rule-list">
            <li>Chấm ngoài văn phòng vẫn được ghi nhận và tính công bình thường.</li>
            <li>Ảnh và GPS là tùy chọn; thiếu bằng chứng không tự tạo lỗi công.</li>
            <li>Chỉ khóa kỳ sau khi HR đã đối soát snapshot và các ngoại lệ.</li>
          </ul>
        </Panel>
      </div>
    </> : null}
  </>;
}
