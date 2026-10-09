"use client";

import { useEffect, useState } from "react";
import { EmptyState, Field, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { formatDate, formatDateTime } from "@/lib/format";

type EventRow = { id: string; work_date: string; kind: "check_in" | "check_out"; occurred_at: string; source: string; location_flag: string | null; evidence_status: string; review_status: string };

export default function MyAttendancePage() {
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const [year, monthNumber] = month.split("-").map(Number);
    const from = `${month}-01`;
    const to = new Date(Date.UTC(year, monthNumber, 0)).toISOString().slice(0, 10);
    apiRequest<ApiEnvelope<EventRow[]>>(`/api/v1/attendance/events?from=${from}&to=${to}&page_size=62`)
      .then(result => { if (active) { setError(""); setRows(result.data ?? []); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được lịch sử chấm công."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [month]);

  return <>
    <PageHeader title="Công của tôi" description="Xem các lượt chấm đã được máy chủ nhận. Dữ liệu offline chưa đồng bộ được hiển thị riêng tại trang Chấm công." />
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <Panel title="Lịch sử theo tháng" action={<Field label="Tháng"><input type="month" value={month} onChange={(event) => setMonth(event.target.value)} /></Field>}>
      {loading ? <div className="loading-state">Đang tải lịch sử…</div> : rows.length === 0 ? <EmptyState title="Chưa có lượt chấm trong tháng này" description="Khi máy chủ nhận lượt chấm, dữ liệu sẽ xuất hiện ở đây." /> :
        <div className="table-wrap"><table><thead><tr><th>Ngày</th><th>Lượt</th><th>Thời gian nhận</th><th>Nguồn</th><th>Ảnh</th><th>Vị trí</th><th>Đối soát</th></tr></thead><tbody>
          {rows.map((row) => <tr key={row.id}><td>{formatDate(row.work_date)}</td><td>{row.kind === "check_in" ? "Chấm vào" : "Chấm ra"}</td><td>{formatDateTime(row.occurred_at)}</td><td>{row.source === "offline" ? "Đồng bộ offline" : "Trực tuyến"}</td><td><StatusBadge value={row.evidence_status} /></td><td>{row.location_flag === "outside" ? "Ngoài văn phòng" : row.location_flag === "inside" ? "Trong văn phòng" : "Không có vị trí"}</td><td><StatusBadge value={row.review_status} /></td></tr>)}
        </tbody></table></div>}
    </Panel>
  </>;
}
