"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Button, EmptyState, Field, LoadingState, Notice, PageHeader, Panel, StatusBadge, TableWrap } from "@/components/ui";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { businessDate, formatDate, formatDateTime } from "@/lib/format";

type Person = { employee_code: string; full_name: string; department: string | null };
type Photo = { id: string; expires_at: string | null; deleted_at: string | null };
type AttendanceRow = { id: string; employee_id: string; work_date: string; kind: string; occurred_at: string; device_occurred_at: string | null; received_at: string; source: string; latitude: number | null; longitude: number | null; distance_m: number | null; location_flag: string | null; evidence_status: string; review_status: string; review_note: string | null; employees: Person | Person[] | null; attendance_photos: Photo | Photo[] | null };
const today = businessDate();
function personOf(value: AttendanceRow["employees"]): Person | null { return Array.isArray(value) ? value[0] ?? null : value; }
function photoOf(value: AttendanceRow["attendance_photos"]): Photo | null { return Array.isArray(value) ? value[0] ?? null : value; }

export default function HrAttendancePage() {
  const [rows, setRows] = useState<AttendanceRow[]>([]); const [from, setFrom] = useState(today); const [to, setTo] = useState(today); const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [message, setMessage] = useState(""); const [photoUrl, setPhotoUrl] = useState(""); const [busyId, setBusyId] = useState("");
  const load = useCallback(async () => {
    try { const params = new URLSearchParams({ from, to, page_size: "100" }); if (status) params.set("status", status); const result = await apiRequest<ApiEnvelope<AttendanceRow[]>>("/api/v1/hr/attendance?" + params); setError(""); setRows(result.data ?? []); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không tải được dữ liệu chấm công."); }
    finally { setLoading(false); }
  }, [from, status, to]);
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ from, to, page_size: "100" }); if (status) params.set("status", status);
    apiRequest<ApiEnvelope<AttendanceRow[]>>("/api/v1/hr/attendance?" + params)
      .then(result => { if (active) { setError(""); setRows(result.data ?? []); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof ApiError ? cause.message : "Không tải được dữ liệu chấm công."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [from, status, to]);
  async function filter(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await load(); }
  async function review(row: AttendanceRow, result: "reviewed" | "rejected") {
    const note = window.prompt(result === "reviewed" ? "Ghi chú đối soát (có thể bỏ trống):" : "Lý do từ chối lượt chấm:", "");
    if (note === null) return;
    if (result === "rejected" && note.trim().length < 3) { setError("Cần nhập lý do từ chối từ 3 ký tự trở lên."); return; }
    setBusyId(row.id); setError(""); setMessage("");
    try { await apiRequest("/api/v1/hr/attendance/" + row.id + "/review", { method: "POST", body: JSON.stringify({ result, note: note.trim() || null }) }); setMessage("Đã lưu kết quả đối soát."); await load(); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không lưu được kết quả đối soát."); }
    finally { setBusyId(""); }
  }
  async function showPhoto(row: AttendanceRow) {
    setError("");
    try { const response = await apiRequest<ApiEnvelope<{ url: string }>>("/api/v1/attendance/events/" + row.id + "/photo"); setPhotoUrl(response.data.url); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không mở được ảnh chấm công."); }
  }
  return <>
    <PageHeader title="Đối soát chấm công" description="Theo dõi đồng bộ, trạng thái ảnh tùy chọn và cờ vị trí tham khảo. Cờ ngoài văn phòng không chặn hoặc làm mất công." action={<Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>Làm mới</Button>} />
    {error && <Notice kind="error">{error}</Notice>}{message && <Notice kind="success">{message}</Notice>}
    <Panel title="Bộ lọc" description="Danh sách tối đa 100 lượt gần nhất theo bộ lọc.">
      <form className="toolbar" onSubmit={filter}><Field label="Từ ngày"><input type="date" value={from} onChange={e => setFrom(e.target.value)} /></Field><Field label="Đến ngày"><input type="date" value={to} onChange={e => setTo(e.target.value)} /></Field><Field label="Kết quả HR"><select value={status} onChange={e => setStatus(e.target.value)}><option value="">Tất cả</option><option value="needs_review">Cần kiểm tra</option><option value="reviewed">Đã kiểm tra</option><option value="rejected">Từ chối</option></select></Field><Button type="submit" variant="secondary" disabled={loading}>Lọc dữ liệu</Button></form>
    </Panel>
    <Panel title="Lượt chấm" description={rows.length + " lượt tải về"}>
      {loading ? <LoadingState /> : rows.length === 0 ? <EmptyState title="Không có lượt chấm" description="Thử đổi ngày lọc hoặc bỏ bộ lọc trạng thái." /> : <TableWrap><table><thead><tr><th>Nhân viên</th><th>Ngày / giờ</th><th>Loại</th><th>Nguồn</th><th>Vị trí</th><th>Ảnh</th><th>Đối soát</th><th></th></tr></thead><tbody>{rows.map(row => { const employee = personOf(row.employees); return <tr key={row.id}>
        <td><strong>{employee?.full_name ?? "Hồ sơ không còn"}</strong><small>{employee?.employee_code ?? row.employee_id}{employee?.department ? " · " + employee.department : ""}</small></td>
        <td>{formatDate(row.work_date)}<small>Server: {formatDateTime(row.occurred_at)}{row.device_occurred_at ? " · Thiết bị: " + formatDateTime(row.device_occurred_at) : ""}</small><small>Nhận: {formatDateTime(row.received_at)}</small></td>
        <td>{row.kind === "check_in" ? "Vào" : "Ra"}</td><td>{row.source === "offline" ? "Đồng bộ offline" : "Trực tuyến"}</td>
      <td>{row.location_flag === "outside" ? "Ngoài văn phòng" : row.location_flag === "inside" ? "Trong văn phòng" : "Không có GPS"}{row.distance_m != null && <small>{Math.round(row.distance_m)} m từ văn phòng</small>}</td>
        <td><StatusBadge value={row.evidence_status} />{photoOf(row.attendance_photos) && !photoOf(row.attendance_photos)?.deleted_at && <div><button className="text-button" type="button" onClick={() => void showPhoto(row)}>Xem ảnh riêng tư</button></div>}</td>
        <td><StatusBadge value={row.review_status} />{row.review_note && <small>{row.review_note}</small>}</td>
        <td>{row.review_status === "needs_review" ? <div className="table-actions"><Button type="button" variant="secondary" disabled={busyId === row.id} onClick={() => void review(row, "reviewed")}>Đã đối soát</Button><Button type="button" variant="danger" disabled={busyId === row.id} onClick={() => void review(row, "rejected")}>Từ chối</Button></div> : "—"}</td>
      </tr>; })}</tbody></table></TableWrap>}
    </Panel>
    {photoUrl && <div className="dialog-backdrop" role="presentation" onClick={() => setPhotoUrl("")}><section className="dialog photo-dialog" role="dialog" aria-modal="true" aria-label="Ảnh chấm công" onClick={event => event.stopPropagation()}><div className="dialog-header"><div><h2>Ảnh chấm công</h2><p>Liên kết riêng tư có thời hạn ngắn.</p></div><Button type="button" variant="secondary" onClick={() => setPhotoUrl("")}>Đóng</Button></div><div className="photo-image-frame"><Image src={photoUrl} alt="Ảnh bằng chứng chấm công" fill unoptimized sizes="(max-width: 767px) 90vw, 640px" /></div></section></div>}
  </>;
}
