"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Button, EmptyState, Field, Notice, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { Dialog } from "@/components/dialog";
import { LeaveHistory, type LeaveRequest } from "@/components/leave-history";
import { formatDate, formatDateTime } from "@/lib/format";

type LeaveType = { id: string; code: string; name: string; deducts_annual_balance: boolean };
type OvertimeRequest = { id: string; work_date: string; start_at: string; end_at: string; reason: string; status: string; review_note: string | null; created_at: string };
type CorrectionRequest = { id: string; work_date: string; proposed_check_in: string | null; proposed_check_out: string | null; reason: string; status: string; review_note: string | null; created_at: string };
type LedgerEntry = { year: number; amount_days: number; entry_type: string; reason: string | null; created_at: string };
type RequestsData = { leave: LeaveRequest[]; overtime: OvertimeRequest[]; corrections: CorrectionRequest[]; leave_ledger: LedgerEntry[] };
type Tab = "leave" | "overtime" | "correction";

function localIso(date: string, time: string) { return new Date(`${date}T${time}:00+07:00`).toISOString(); }
function dayParts(from: string, to: string, part: string) {
  const start = new Date(`${from}T00:00:00Z`); const end = new Date(`${to}T00:00:00Z`); const values: { date: string; part: string }[] = [];
  for (let cursor = start; cursor <= end && values.length < 32; cursor.setUTCDate(cursor.getUTCDate() + 1)) values.push({ date: cursor.toISOString().slice(0, 10), part });
  return values;
}

export default function MyRequestsPage() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("leave");
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [requests, setRequests] = useState<RequestsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [leavePart, setLeavePart] = useState("full");
  const [leaveReason, setLeaveReason] = useState("");
  const [overtimeDate, setOvertimeDate] = useState("");
  const [overtimeStart, setOvertimeStart] = useState("");
  const [overtimeEnd, setOvertimeEnd] = useState("");
  const [overtimeReason, setOvertimeReason] = useState("");
  const [correctionDate, setCorrectionDate] = useState("");
  const [correctionIn, setCorrectionIn] = useState("");
  const [correctionOut, setCorrectionOut] = useState("");
  const [correctionReason, setCorrectionReason] = useState("");

  const load = useCallback(async () => {
    try {
      const [history, leaveTypes] = await Promise.all([
        apiRequest<ApiEnvelope<RequestsData>>("/api/v1/me/requests"),
        apiRequest<ApiEnvelope<LeaveType[]>>("/api/v1/leave-types"),
      ]);
      setError("");
      setRequests(history.data); setTypes(leaveTypes.data ?? []);
      setLeaveTypeId(current => current || leaveTypes.data?.[0]?.id || "");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Không tải được đơn và yêu cầu."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    let active = true;
    Promise.all([apiRequest<ApiEnvelope<RequestsData>>("/api/v1/me/requests"), apiRequest<ApiEnvelope<LeaveType[]>>("/api/v1/leave-types")])
      .then(([history, leaveTypes]) => {
        if (!active) return;
        setError(""); setRequests(history.data); setTypes(leaveTypes.data ?? []);
        setLeaveTypeId(current => current || leaveTypes.data?.[0]?.id || "");
      })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Không tải được đơn và yêu cầu."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const leaveStats = useMemo(() => {
    const year = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric" }).format(new Date()));
    const ledger = (requests?.leave_ledger ?? []).filter(entry => entry.year === year);
    return {
      balance: ledger.reduce((sum, entry) => sum + Number(entry.amount_days), 0),
      granted: ledger.filter(entry => !["deduction", "reversal"].includes(entry.entry_type)).reduce((sum, entry) => sum + Number(entry.amount_days), 0),
      used: Math.max(0, -ledger.filter(entry => ["deduction", "reversal"].includes(entry.entry_type)).reduce((sum, entry) => sum + Number(entry.amount_days), 0)),
      pending: (requests?.leave ?? []).filter(item => item.status === "pending" && types.some(type => type.id === item.leave_type_id && type.deducts_annual_balance)).reduce((sum, item) => sum + item.day_parts.filter(part => part.date.startsWith(String(year) + "-")).reduce((days, part) => days + (part.part === "full" ? 1 : 0.5), 0), 0),
    };
  }, [requests, types]);

  async function submit(path: string, body: unknown) {
    setBusy(true); setError(""); setMessage("");
    try { await apiRequest(path, { method: "POST", body: JSON.stringify(body) }); setMessage("Đã gửi yêu cầu. Bạn có thể theo dõi trạng thái bên dưới."); await load(); return true; }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không gửi được yêu cầu."); return false; }
    finally { setBusy(false); }
  }

  async function onLeave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!leaveTypeId || !startDate || !endDate || endDate < startDate) { setError("Hãy chọn loại nghỉ và khoảng ngày hợp lệ."); return; }
    if (startDate !== endDate && leavePart !== "full") { setError("Đơn nhiều ngày chỉ hỗ trợ nghỉ cả ngày. Hãy gửi đơn nửa ngày riêng."); return; }
    const sent = await submit("/api/v1/leave-requests", { leave_type_id: leaveTypeId, start_date: startDate, end_date: endDate, day_parts: dayParts(startDate, endDate, leavePart), reason: leaveReason });
    if (sent) { setLeaveReason(""); setComposerOpen(false); }
  }

  async function onOvertime(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!overtimeDate || !overtimeStart || !overtimeEnd) { setError("Hãy chọn ngày và giờ tăng ca."); return; }
    const sent = await submit("/api/v1/overtime-requests", { work_date: overtimeDate, start_at: localIso(overtimeDate, overtimeStart), end_at: localIso(overtimeDate, overtimeEnd), reason: overtimeReason });
    if (sent) { setOvertimeReason(""); setComposerOpen(false); }
  }

  async function onCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!correctionDate || (!correctionIn && !correctionOut)) { setError("Chọn ngày và ít nhất một mốc giờ đề nghị."); return; }
    const sent = await submit("/api/v1/attendance/corrections", { work_date: correctionDate, proposed_check_in: correctionIn ? localIso(correctionDate, correctionIn) : null, proposed_check_out: correctionOut ? localIso(correctionDate, correctionOut) : null, reason: correctionReason });
    if (sent) { setCorrectionReason(""); setComposerOpen(false); }
  }

  async function cancelRequest(type: "leave" | "overtime" | "correction", id: string) {
    const reason = window.prompt("Lý do hủy yêu cầu (tối thiểu 3 ký tự):");
    if (!reason) return;
    await submit(`/api/v1/requests/${type}/${id}/cancel`, { reason });
  }

  return <div className="personal-leave-page">
    <PageHeader title="Nghỉ phép" description="Tạo và theo dõi đơn nghỉ phép, tăng ca và sửa công của bạn" action={<Button type="button" aria-expanded={composerOpen} onClick={() => setComposerOpen(open => !open)}>+ Tạo đơn nghỉ phép / tăng ca / sửa công</Button>} />
    {error && <Notice kind="error">{error}</Notice>}{message && <Notice kind="success">{message}</Notice>}
    <div className="stats-grid leave-stats">
      <div className="stat-card"><span>Phép năm</span><strong>{requests ? leaveStats.granted.toLocaleString("vi-VN") + " ngày" : "—"}</strong></div>
      <div className="stat-card"><span>Đã sử dụng</span><strong>{requests ? leaveStats.used.toLocaleString("vi-VN") + " ngày" : "—"}</strong></div>
      <div className="stat-card"><span>Đang chờ</span><strong>{requests ? leaveStats.pending.toLocaleString("vi-VN") + " ngày" : "—"}</strong></div>
      <div className="stat-card stat-cyan"><span>Còn lại</span><strong>{requests ? leaveStats.balance.toLocaleString("vi-VN") + " ngày" : "—"}</strong></div>
    </div>
    {composerOpen && <Dialog title="Tạo đơn nghỉ phép / tăng ca / sửa công" busy={busy} onClose={() => setComposerOpen(false)}>
      {error && <Notice kind="error">{error}</Notice>}
      <div className="tabs" role="tablist" aria-label="Loại yêu cầu">
        {([["leave", "Đơn nghỉ phép"], ["overtime", "Đơn tăng ca"], ["correction", "Đơn sửa công"]] as [Tab, string][]).map(([value, label]) => <button key={value} type="button" className="tab-button" role="tab" aria-selected={tab === value} onClick={() => { setTab(value); setError(""); }}>{label}</button>)}
      </div>
      {tab === "leave" && <form onSubmit={onLeave}><div className="form-grid">
        <Field label="Loại nghỉ"><select required value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)}><option value="">Chọn loại nghỉ</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}{type.deducts_annual_balance ? " · trừ phép năm" : ""}</option>)}</select></Field>
        <Field label="Hình thức nghỉ"><select value={leavePart} onChange={(event) => setLeavePart(event.target.value)}><option value="full">Cả ngày</option><option value="morning">Nửa ngày buổi sáng</option><option value="afternoon">Nửa ngày buổi chiều</option></select></Field>
        <Field label="Từ ngày"><input type="date" required value={startDate} onChange={(event) => { setStartDate(event.target.value); if (!endDate) setEndDate(event.target.value); }} /></Field>
        <Field label="Đến ngày"><input type="date" required value={endDate} onChange={(event) => setEndDate(event.target.value)} /></Field>
        <Field label="Lý do" ><textarea className="full" required minLength={3} maxLength={2000} value={leaveReason} onChange={(event) => setLeaveReason(event.target.value)} /></Field>
      </div><div className="form-actions"><Button type="submit" disabled={busy || types.length === 0}>{busy ? "Đang gửi…" : "Gửi đơn nghỉ phép"}</Button></div>{types.length === 0 && <p className="subtle-note">Chưa có loại nghỉ được admin cấu hình.</p>}</form>}
      {tab === "overtime" && <form onSubmit={onOvertime}><div className="form-grid">
        <Field label="Ngày tăng ca"><input type="date" required value={overtimeDate} onChange={(event) => setOvertimeDate(event.target.value)} /></Field>
        <div className="form-grid"><Field label="Từ giờ"><input type="time" required value={overtimeStart} onChange={(event) => setOvertimeStart(event.target.value)} /></Field><Field label="Đến giờ"><input type="time" required value={overtimeEnd} onChange={(event) => setOvertimeEnd(event.target.value)} /></Field></div>
        <Field label="Lý do"><textarea required minLength={3} maxLength={2000} value={overtimeReason} onChange={(event) => setOvertimeReason(event.target.value)} /></Field>
      </div><p className="subtle-note">Ngày Chủ nhật/ngày nghỉ tự tính tăng ca theo giờ chấm thực tế; không gửi đơn tăng ca cho ngày nghỉ để tránh cộng trùng.</p><div className="form-actions"><Button type="submit" disabled={busy}>{busy ? "Đang gửi…" : "Gửi yêu cầu tăng ca"}</Button></div></form>}
      {tab === "correction" && <form onSubmit={onCorrection}><div className="form-grid">
        <Field label="Ngày cần sửa"><input type="date" required value={correctionDate} onChange={(event) => setCorrectionDate(event.target.value)} /></Field>
        <Field label="Giờ vào đề nghị"><input type="time" value={correctionIn} onChange={(event) => setCorrectionIn(event.target.value)} /></Field>
        <Field label="Giờ ra đề nghị"><input type="time" value={correctionOut} onChange={(event) => setCorrectionOut(event.target.value)} /></Field>
        <Field label="Lý do"><textarea required minLength={3} maxLength={2000} value={correctionReason} onChange={(event) => setCorrectionReason(event.target.value)} /></Field>
      </div><div className="form-actions"><Button type="submit" disabled={busy}>{busy ? "Đang gửi…" : "Gửi yêu cầu sửa công"}</Button></div></form>}
    </Dialog>}
    <LeaveHistory rows={requests?.leave ?? []} types={types} loading={loading} busy={busy} onCancel={id => { void cancelRequest("leave", id); }} />
    <div className="request-history-grid supplemental-requests">
      <Panel title="Tăng ca" description="Tăng ca ngày thường cần duyệt trước khi tính.">{loading ? <div className="loading-state">Đang tải…</div> : requests?.overtime.length ? <div className="request-list">{requests.overtime.map((item) => <article className="request-card" key={item.id}><div className="request-top"><strong>{formatDate(item.work_date)}</strong><StatusBadge value={item.status} /></div><p>{formatDateTime(item.start_at)} – {formatDateTime(item.end_at)}</p><small>{item.reason}</small>{item.review_note && <small className="review-note">Ghi chú: {item.review_note}</small>}{item.status === "pending" && <Button type="button" variant="danger" onClick={() => cancelRequest("overtime", item.id)}>Hủy yêu cầu</Button>}</article>)}</div> : <EmptyState title="Chưa có yêu cầu tăng ca" />}</Panel>
      <Panel title="Sửa công" description="Event gốc được giữ nguyên; duyệt tạo bản điều chỉnh riêng.">{loading ? <div className="loading-state">Đang tải…</div> : requests?.corrections.length ? <div className="request-list">{requests.corrections.map((item) => <article className="request-card" key={item.id}><div className="request-top"><strong>{formatDate(item.work_date)}</strong><StatusBadge value={item.status} /></div><p>Vào: {item.proposed_check_in ? formatDateTime(item.proposed_check_in) : "Không đổi"} · Ra: {item.proposed_check_out ? formatDateTime(item.proposed_check_out) : "Không đổi"}</p><small>{item.reason}</small>{item.review_note && <small className="review-note">Ghi chú: {item.review_note}</small>}{item.status === "pending" && <Button type="button" variant="danger" onClick={() => cancelRequest("correction", item.id)}>Hủy yêu cầu</Button>}</article>)}</div> : <EmptyState title="Chưa có yêu cầu sửa công" />}</Panel>
    </div>
  </div>;
}
