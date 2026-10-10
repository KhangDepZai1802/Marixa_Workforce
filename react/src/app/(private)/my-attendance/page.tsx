"use client";
import { MonthSummary } from "@/features/attendance/month-summary";

import { useEffect, useState } from "react";
import { PhotoDialog } from "@/components/photo-dialog";
import { EmptyState, Field, Notice, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { businessDate, formatDate, formatDateTime } from "@/lib/format";

type EventRow = { id: string; work_date: string; kind: "check_in" | "check_out"; occurred_at: string; source: string; location_flag: string | null; evidence_status: string; review_status: string };

export default function MyAttendancePage() {
  const [month, setMonth] = useState(() => businessDate().slice(0, 7));
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
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

  async function showPhoto(id: string) {
    setError("");
    try {
      const result = await apiRequest<ApiEnvelope<{ url: string }>>(`/api/v1/attendance/events/${id}/photo`);
      setPhotoUrl(result.data.url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không mở được ảnh chấm công."); }
  }

  return <>
    <PageHeader title="Công của tôi" description="Xem các lượt chấm đã được máy chủ nhận. Dữ liệu offline chưa đồng bộ được hiển thị riêng tại trang Chấm công." />
    {error && <Notice kind="error">{error}</Notice>}
    <MonthSummary month={month} />
    <Panel title="Lịch sử theo tháng" action={<Field label="Tháng"><input type="month" value={month} onChange={(event) => { setLoading(true); setMonth(event.target.value); }} /></Field>}>
      {loading ? <div className="loading-state">Đang tải lịch sử…</div> : rows.length === 0 ? <EmptyState title="Chưa có lượt chấm trong tháng này" description="Khi máy chủ nhận lượt chấm, dữ liệu sẽ xuất hiện ở đây." /> :
        <div className="table-wrap"><table><thead><tr><th>Ngày</th><th>Lượt</th><th>Thời gian nhận</th><th>Nguồn</th><th>Ảnh</th><th>Vị trí</th><th>Đối soát</th></tr></thead><tbody>
          {rows.map((row) => <tr key={row.id}><td>{formatDate(row.work_date)}</td><td>{row.kind === "check_in" ? "Chấm vào" : "Chấm ra"}</td><td>{formatDateTime(row.occurred_at)}</td><td>{row.source === "offline" ? "Đồng bộ offline" : "Trực tuyến"}</td><td><StatusBadge value={row.evidence_status === "pending" ? "pending_upload" : row.evidence_status} />{row.evidence_status === "ready" && <div><button className="text-button" type="button" onClick={() => void showPhoto(row.id)}>Xem ảnh</button></div>}</td><td>{row.location_flag === "outside" ? "Ngoài văn phòng" : row.location_flag === "inside" ? "Trong văn phòng" : row.location_flag === "inaccurate" ? "GPS chưa chính xác" : "Không có vị trí"}</td><td><StatusBadge value={row.review_status} /></td></tr>)}
        </tbody></table></div>}
    </Panel>
    {photoUrl && <PhotoDialog url={photoUrl} onClose={() => setPhotoUrl("")} />}
  </>;
}
