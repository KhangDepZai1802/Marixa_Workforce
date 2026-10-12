"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, EmptyState, Field, LoadingState, Notice, PageHeader, Panel, StatusBadge, TableWrap } from "@/components/ui";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { Dialog } from "@/components/dialog";
import { useQueryState } from "@/lib/use-query-state";
import { businessDate, labelStatus, labelException, formatDate, formatMinutes } from "@/lib/format";

type Period = { id: string; year: number; month: number; status: string; reviewed_at?: string | null; locked_at?: string | null; version: number };
type Day = { id: string; employee_id: string; work_date: string; regular_minutes: number; overtime_minutes: number; overtime_kind: string | null; leave_days: number; late_minutes: number; early_minutes: number; exceptions: string[]; full_name_snapshot: string; employee_code_snapshot: string; department_snapshot: string | null; previous_period_regular_adjustment: number; previous_period_overtime_adjustment: number; previous_period_source_period_id: string | null };
type Detail = { period: Period; days: Day[]; exception_reviews: { employee_id: string; work_date: string; issue_code: string; note: string }[] };
type Adjustment = { id: string; employee_id: string; source_event_id: string; source_period_id: string; target_period_id: string; work_date: string; regular_minutes_delta: number; overtime_minutes_delta: number; status: string; reason: string; review_note: string | null; preview_error?: string; preview?: { source_snapshot: { regular_minutes: number; overtime_minutes: number }; event: { kind: string; device_occurred_at: string; received_at: string; review_status: string }; event_count: number; approved_correction_id: string | null; approved_adjustment_count: number; compensated_regular_minutes: number; compensated_overtime_minutes: number; calculated_regular_minutes: number; calculated_overtime_minutes: number; suggested_regular_minutes_delta: number; suggested_overtime_minutes_delta: number; complete: boolean; exceptions: string[] } };
const today = businessDate();
type Confirmation = { kind: "period"; action: "lock" | "unlock" } | { kind: "exception"; day: Day; issue: string } | { kind: "adjustment"; item: Adjustment; decision: "approved" | "rejected" };

export default function HrTimesheetsPage() {
  const { params, updateQuery } = useQueryState();
  const [periods, setPeriods] = useState<Period[]>([]);
  const selectedId = params.get("period") || periods[0]?.id || "";
  const tab = ["days", "exceptions", "adjustments"].includes(params.get("tab") ?? "") ? params.get("tab")! : "days";
  const query = params.get("q") ?? "";
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [note, setNote] = useState("");
  function ask(value: Confirmation) { setNote(""); setError(""); setConfirmation(value); }
  const [detail, setDetail] = useState<Detail | null>(null); const [adjustments, setAdjustments] = useState<Adjustment[]>([]); const [role, setRole] = useState("hr");
  const [year, setYear] = useState(Number(today.slice(0, 4))); const [month, setMonth] = useState(Number(today.slice(5, 7))); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  async function loadPeriods() { try { const [periodResult, me] = await Promise.all([apiRequest<ApiEnvelope<Period[]>>("/api/v1/hr/timesheet-periods"), apiRequest<ApiEnvelope<{ account: { role: string } }>>("/api/v1/me")]); setError(""); setPeriods(periodResult.data ?? []); setRole(me.data.account.role); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không tải được kỳ công."); } finally { setLoading(false); } }
  async function loadDetail(id: string) { if (!id) return; try { const [result, adjustmentResult] = await Promise.all([apiRequest<ApiEnvelope<Detail>>("/api/v1/hr/timesheet-periods/" + id), apiRequest<ApiEnvelope<Adjustment[]>>("/api/v1/hr/timesheet-adjustments?period_id=" + id)]); setError(""); setDetail(result.data); setAdjustments(adjustmentResult.data ?? []); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không tải được chi tiết kỳ công."); setDetail(null); } }
  useEffect(() => {
    let active = true;
    Promise.all([apiRequest<ApiEnvelope<Period[]>>("/api/v1/hr/timesheet-periods"), apiRequest<ApiEnvelope<{ account: { role: string } }>>("/api/v1/me")])
      .then(([periodResult, me]) => { if (!active) return; setError(""); setPeriods(periodResult.data ?? []); setRole(me.data.account.role); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof ApiError ? cause.message : "Không tải được kỳ công."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    Promise.all([apiRequest<ApiEnvelope<Detail>>("/api/v1/hr/timesheet-periods/" + selectedId), apiRequest<ApiEnvelope<Adjustment[]>>("/api/v1/hr/timesheet-adjustments?period_id=" + selectedId)])
      .then(([result, adjustmentResult]) => { if (active) { setError(""); setDetail(result.data); setAdjustments(adjustmentResult.data ?? []); } })
      .catch((cause: unknown) => { if (active) { setError(cause instanceof ApiError ? cause.message : "Không tải được chi tiết kỳ công."); setDetail(null); } });
    return () => { active = false; };
  }, [selectedId]);
  async function createPeriod(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); setMessage(""); try { const result = await apiRequest<ApiEnvelope<Period>>("/api/v1/hr/timesheet-periods", { method: "POST", body: JSON.stringify({ year: Number(year), month: Number(month) }) }); setMessage("Đã chọn kỳ công tháng " + String(result.data.month).padStart(2, "0") + "/" + result.data.year + "."); await loadPeriods(); updateQuery({ period: result.data.id, page: null }); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không tạo được kỳ công."); } finally { setBusy(false); } }
  async function action(name: "recalculate" | "review" | "lock" | "unlock", reason?: string) {
    if (!detail) return;
    if ((name === "lock" || name === "unlock") && role !== "admin") return;
    if (name === "unlock" && (!reason || reason.trim().length < 3)) { setError("Lý do cần ít nhất 3 ký tự."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const path = name === "unlock" ? "/api/v1/admin/timesheet-periods/" + detail.period.id + "/unlock" : "/api/v1/hr/timesheet-periods/" + detail.period.id + "/" + name;
      await apiRequest(path, { method: "POST", ...(name === "unlock" ? { body: JSON.stringify({ reason }) } : {}) });
      setMessage(name === "recalculate" ? "Đã tính lại và lưu phiên bản bảng công mới." : name === "review" ? "HR đã xác nhận đối soát kỳ." : name === "lock" ? "Admin đã khóa kỳ công." : "Admin đã mở lại kỳ công có ghi lý do.");
      await Promise.all([loadPeriods(), loadDetail(selectedId)]);
      setConfirmation(null);
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không thể cập nhật trạng thái kỳ công."); }
    finally { setBusy(false); }
  }
  async function acknowledge(day: Day, issueCode: string, note: string) {
    if (!note || note.trim().length < 3) { if (note !== null) setError("Ghi chú xử lý cần ít nhất 3 ký tự."); return; }
    setBusy(true); setError(""); setMessage("");
    try { await apiRequest("/api/v1/hr/timesheet-periods/" + selectedId + "/exceptions", { method: "POST", body: JSON.stringify({ day_id: day.id, issue_code: issueCode, note: note.trim() }) }); setMessage("Đã ghi nhận xử lý ngoại lệ."); await loadDetail(selectedId); setConfirmation(null); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không ghi được xử lý ngoại lệ."); }
    finally { setBusy(false); }
  }
  async function download() {
    if (!selectedId) return;
    setError("");
    try { const response = await apiRequest<Response>("/api/v1/reports/timesheet.xlsx?period_id=" + selectedId); const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "marixa-timesheet-" + detail?.period.year + "-" + String(detail?.period.month).padStart(2, "0") + ".xlsx"; anchor.click(); URL.revokeObjectURL(url); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không xuất được Excel. Hãy tính bảng công trước."); }
  }
  async function decideAdjustment(item: Adjustment, decision: "approved" | "rejected", note: string) {
    if (!item.preview) { setError(item.preview_error ?? "Chưa đối soát được kỳ gốc."); return; }
    if (!note || note.trim().length < 3) { if (note !== null) setError("Ghi chú cần ít nhất 3 ký tự."); return; }
    setBusy(true); setError(""); setMessage("");
    try { const result = await apiRequest<ApiEnvelope<Adjustment>>("/api/v1/hr/timesheet-adjustments", { method: "POST", body: JSON.stringify({ adjustment_id: item.id, decision, review_note: note.trim() }) }); setMessage(result.data.target_period_id !== selectedId ? "Đã xử lý; kỳ đích cũ đã đóng nên khoản điều chỉnh được chuyển sang kỳ mở tiếp theo." : "Đã xử lý điều chỉnh kỳ trước. Hãy tính lại bảng công kỳ đích."); await Promise.all([loadPeriods(), loadDetail(selectedId)]); setConfirmation(null); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không xử lý được điều chỉnh."); }
    finally { setBusy(false); }
  }
  const filteredDays = (detail?.period.id === selectedId ? detail.days : []).filter(day => (tab !== "exceptions" || day.exceptions.length > 0) && `${day.full_name_snapshot} ${day.employee_code_snapshot} ${day.department_snapshot ?? ""}`.toLocaleLowerCase("vi").includes(query.toLocaleLowerCase("vi")));
  const pageCount = Math.max(1, Math.ceil(filteredDays.length / 25));
  const page = Math.min(pageCount, Math.max(1, Number(params.get("page")) || 1));
  const visibleDays = filteredDays.slice((page - 1) * 25, page * 25);
  function periodLabel(id: string | null) { const period = periods.find(item => item.id === id); return period ? `${String(period.month).padStart(2, "0")}/${period.year}` : "Kỳ công trước"; }
  const acknowledged = new Set((detail?.exception_reviews ?? []).map(item => item.work_date + ":" + item.employee_id + ":" + item.issue_code));
  return <>
    <PageHeader title="Bảng công" description="Kiểm tra công, xử lý ngoại lệ và chốt số liệu theo tháng." action={<Button type="button" variant="secondary" onClick={() => { void loadPeriods(); if (selectedId) void loadDetail(selectedId); }} disabled={loading}>Làm mới</Button>} />
    {error && <Notice kind="error">{error}</Notice>}{message && <Notice kind="success">{message}</Notice>}
    <Panel title="Chọn hoặc tạo kỳ" description="Tạo lại kỳ đã tồn tại sẽ mở đúng bản ghi hiện hữu.">
      <form className="toolbar" onSubmit={createPeriod}><Field label="Năm"><input type="number" min={2000} max={2200} value={year} onChange={e => setYear(Number(e.target.value))} /></Field><Field label="Tháng"><select value={month} onChange={e => setMonth(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => i + 1).map(value => <option key={value} value={value}>{String(value).padStart(2, "0")}</option>)}</select></Field><Button type="submit" disabled={busy}>Mở kỳ</Button><Field label="Kỳ hiện có"><select value={selectedId} onChange={e => updateQuery({ period: e.target.value, page: null })}><option value="">Chọn kỳ công</option>{periods.map(period => <option key={period.id} value={period.id}>{String(period.month).padStart(2, "0")}/{period.year} · {labelStatus(period.status)}</option>)}</select></Field></form>
      {loading && <LoadingState label="Đang tải các kỳ công…" />}
    </Panel>
    {!loading && selectedId && detail?.period.id !== selectedId && !error && <LoadingState label="Đang tải chi tiết kỳ công…" />}
    {detail?.period.id === selectedId && detail && <>
      <Panel title={"Kỳ " + String(detail.period.month).padStart(2, "0") + "/" + detail.period.year} description={"Bản công lần " + detail.period.version + " · " + detail.days.length + " dòng công"} action={<StatusBadge value={detail.period.status} />}>
        <div className="inline-actions">
          <Button type="button" variant="secondary" disabled={busy || detail.period.status !== "open"} onClick={() => void action("recalculate")}>Tính lại bảng công</Button>
          <Button type="button" variant="secondary" disabled={busy || detail.period.status !== "open" || detail.days.length === 0} onClick={() => void action("review")}>HR xác nhận đối soát</Button>
          {role === "admin" && <Button type="button" disabled={busy || detail.period.status !== "hr_reviewed"} onClick={() => ask({ kind: "period", action: "lock" })}>Admin khóa kỳ</Button>}
          {role === "admin" && detail.period.status === "locked" && <Button type="button" variant="danger" disabled={busy} onClick={() => ask({ kind: "period", action: "unlock" })}>Mở lại có lý do</Button>}
          <Button type="button" variant="secondary" disabled={detail.days.length === 0} onClick={() => void download()}>Tải Excel</Button>
        </div>
      </Panel>
      <nav className="tabs" aria-label="Nội dung kỳ công">{[["days", "Công theo ngày"], ["exceptions", "Ngoại lệ"], ["adjustments", "Điều chỉnh kỳ trước"]].map(([value, label]) => <button key={value} type="button" className={tab === value ? "active" : ""} aria-current={tab === value ? "page" : undefined} onClick={() => updateQuery({ tab: value, page: null })}>{label}</button>)}</nav>
      {tab !== "adjustments" && <Panel title={tab === "exceptions" ? "Ngoại lệ cần kiểm tra" : "Công theo ngày"} description="Công thường, tăng ca và điều chỉnh kỳ trước được thể hiện riêng.">
        <div className="toolbar"><Field label="Tìm nhân viên"><input type="search" value={query} placeholder="Tên, mã hoặc phòng ban" onChange={event => updateQuery({ q: event.target.value, page: null }, true)} /></Field></div>
        {filteredDays.length === 0 ? <EmptyState title={detail.days.length ? "Không có dòng công phù hợp" : "Chưa có bản công"} description={detail.days.length ? "Đổi từ khóa hoặc xem Công theo ngày." : "Chọn Tính lại bảng công để tổng hợp chấm công, phép và chính sách hiện hành."} /> : <TableWrap><table><thead><tr><th>Ngày</th><th>Nhân viên</th><th>Công thường</th><th>Tăng ca</th><th>Phép</th><th>Đi trễ / về sớm</th><th>Điều chỉnh kỳ trước</th><th>Ngoại lệ</th></tr></thead><tbody>{visibleDays.map(day => <tr key={day.id}><td data-label="Ngày">{formatDate(day.work_date)}</td><td data-label="Nhân viên"><strong>{day.full_name_snapshot}</strong><small>{day.employee_code_snapshot}{day.department_snapshot ? " · " + day.department_snapshot : ""}</small></td><td data-label="Công thường">{formatMinutes(day.regular_minutes)}</td><td data-label="Tăng ca">{formatMinutes(day.overtime_minutes)}<small>{day.overtime_kind === "automatic_rest_day" ? "Tự động ngày nghỉ" : day.overtime_kind === "approved_workday" ? "Đã duyệt ngày thường" : day.overtime_minutes ? "Snapshot cũ chưa phân loại" : ""}</small></td><td data-label="Phép">{day.leave_days}</td><td data-label="Đi trễ / về sớm">{day.late_minutes} / {day.early_minutes} phút</td><td data-label="Điều chỉnh kỳ trước">{day.previous_period_regular_adjustment || day.previous_period_overtime_adjustment ? <>{day.previous_period_regular_adjustment} / {day.previous_period_overtime_adjustment} phút<small>Kỳ nguồn {periodLabel(day.previous_period_source_period_id)}</small></> : "—"}</td><td data-label="Ngoại lệ">{day.exceptions?.length ? <div className="exception-list">{day.exceptions.map(issue => <div key={issue}><span>{labelException(issue)}</span>{acknowledged.has(day.work_date + ":" + day.employee_id + ":" + issue) ? <StatusBadge value="reviewed" /> : detail.period.status === "open" ? <Button type="button" variant="secondary" disabled={busy} onClick={() => ask({ kind: "exception", day, issue })}>Ghi chú xử lý</Button> : <StatusBadge value="needs_review" />}</div>)}</div> : "—"}</td></tr>)}</tbody></table></TableWrap>}
        <footer className="reference-pagination"><span>{filteredDays.length} dòng công · 25 dòng mỗi trang</span><div><Button type="button" variant="secondary" disabled={page === 1} onClick={() => updateQuery({ page: String(page - 1) })}>Trước</Button><span>{page} / {pageCount}</span><Button type="button" variant="secondary" disabled={page === pageCount} onClick={() => updateQuery({ page: String(page + 1) })}>Sau</Button></div></footer>
      </Panel>}
      {tab === "adjustments" && <Panel title="Điều chỉnh từ kỳ đã khóa" description="Các khoản chênh lệch được xét duyệt riêng và chỉ cộng vào bảng công kỳ đích đang mở.">
        {adjustments.length === 0 ? <EmptyState title="Không có điều chỉnh kỳ trước" /> : <TableWrap><table><thead><tr><th>Ngày gốc</th><th>Mốc chấm và đối soát</th><th>Chênh lệch đề xuất (phút)</th><th>Trạng thái</th><th></th></tr></thead><tbody>{adjustments.map(item => <tr key={item.id}><td data-label="Ngày gốc">{formatDate(item.work_date)}<small>Kỳ nguồn {periodLabel(item.source_period_id)}</small></td><td data-label="Mốc chấm và đối soát">{item.preview ? <><small>{item.preview.event.kind === "check_in" ? "Chấm vào" : "Chấm ra"} · giờ thiết bị {item.preview.event.device_occurred_at ? new Date(item.preview.event.device_occurred_at).toLocaleString("vi-VN") : "—"}</small><small>Máy chủ nhận {new Date(item.preview.event.received_at).toLocaleString("vi-VN")}</small><small>Bản công gốc: {item.preview.source_snapshot.regular_minutes} thường / {item.preview.source_snapshot.overtime_minutes} tăng ca</small><small>Tính lại: {item.preview.calculated_regular_minutes} thường / {item.preview.calculated_overtime_minutes} tăng ca · {item.preview.complete ? "đủ mốc" : "thiếu mốc"}</small><small>Đã bù: {item.preview.compensated_regular_minutes} thường / {item.preview.compensated_overtime_minutes} tăng ca ({item.preview.approved_adjustment_count} điều chỉnh)</small><small>{item.preview.approved_correction_id ? "Đã có đơn sửa công được duyệt" : "Chưa có đơn sửa công được duyệt"} · {item.preview.event_count} mốc chấm gốc</small>{item.preview.exceptions.length > 0 && <small>Ngoại lệ: {item.preview.exceptions.map(labelException).join(", ")}</small>}</> : <small>{item.preview_error ?? item.source_event_id}</small>}</td><td data-label="Chênh lệch đề xuất (phút)">{item.preview ? `${item.preview.suggested_regular_minutes_delta} thường · ${item.preview.suggested_overtime_minutes_delta} tăng ca` : `${item.regular_minutes_delta} thường · ${item.overtime_minutes_delta} tăng ca`}<small>{item.reason}</small></td><td data-label="Trạng thái"><StatusBadge value={item.status} />{item.review_note && <small>{item.review_note}</small>}</td><td data-label="Thao tác">{item.status === "pending_review" && item.preview ? <div className="table-actions"><Button type="button" disabled={busy} onClick={() => ask({ kind: "adjustment", item, decision: "approved" })}>Xác nhận chênh lệch</Button><Button type="button" variant="danger" disabled={busy} onClick={() => ask({ kind: "adjustment", item, decision: "rejected" })}>Từ chối</Button></div> : "—"}</td></tr>)}</tbody></table></TableWrap>}
      </Panel>}
    </>}
    {confirmation && <Dialog title={confirmation.kind === "period" ? confirmation.action === "lock" ? "Khóa kỳ công" : "Mở lại kỳ công" : confirmation.kind === "exception" ? "Ghi nhận xử lý ngoại lệ" : confirmation.decision === "approved" ? "Xác nhận điều chỉnh" : "Từ chối điều chỉnh"} busy={busy} onClose={() => setConfirmation(null)}>
      {error && <Notice kind="error">{error}</Notice>}
      <p>{confirmation.kind === "period" ? `Kỳ ${periodLabel(selectedId)}. ${confirmation.action === "lock" ? "Bản công sẽ được chốt. Muốn sửa sau đó cần mở lại và ghi rõ lý do." : "Kỳ sẽ được mở lại để xử lý và đối soát lại số liệu."}` : confirmation.kind === "exception" ? `${confirmation.day.full_name_snapshot} · ${formatDate(confirmation.day.work_date)} · ${labelException(confirmation.issue)}` : `${formatDate(confirmation.item.work_date)} · ${confirmation.item.preview?.suggested_regular_minutes_delta ?? 0} phút công thường, ${confirmation.item.preview?.suggested_overtime_minutes_delta ?? 0} phút tăng ca.`}</p>
      <form onSubmit={event => { event.preventDefault(); if (confirmation.kind === "period") void action(confirmation.action, note.trim()); else if (confirmation.kind === "exception") void acknowledge(confirmation.day, confirmation.issue, note); else void decideAdjustment(confirmation.item, confirmation.decision, note); }}>
        {!(confirmation.kind === "period" && confirmation.action === "lock") && <Field label="Lý do / ghi chú xử lý" hint="Ít nhất 3 ký tự, được lưu cùng thao tác."><textarea required minLength={3} maxLength={2000} value={note} onChange={event => setNote(event.target.value)} /></Field>}
        <div className="form-actions"><Button type="button" variant="secondary" disabled={busy} onClick={() => setConfirmation(null)}>Quay lại</Button><Button type="submit" disabled={busy}>{busy ? "Đang lưu…" : "Xác nhận"}</Button></div>
      </form>
    </Dialog>}
  </>;
}
