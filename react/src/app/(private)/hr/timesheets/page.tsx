"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button, EmptyState, Field, LoadingState, Notice, PageHeader, Panel, StatusBadge, TableWrap } from "@/components/ui";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { formatDate, formatMinutes } from "@/lib/format";

type Period = { id: string; year: number; month: number; status: string; reviewed_at?: string | null; locked_at?: string | null; version: number };
type Day = { id: string; employee_id: string; work_date: string; regular_minutes: number; overtime_minutes: number; overtime_kind: string | null; leave_days: number; late_minutes: number; early_minutes: number; exceptions: string[]; full_name_snapshot: string; employee_code_snapshot: string; department_snapshot: string | null; previous_period_regular_adjustment: number; previous_period_overtime_adjustment: number; previous_period_source_period_id: string | null };
type Detail = { period: Period; days: Day[]; exception_reviews: { employee_id: string; work_date: string; issue_code: string; note: string }[] };
type Adjustment = { id: string; employee_id: string; source_event_id: string; source_period_id: string; target_period_id: string; work_date: string; regular_minutes_delta: number; overtime_minutes_delta: number; status: string; reason: string; review_note: string | null; preview_error?: string; preview?: { source_snapshot: { regular_minutes: number; overtime_minutes: number }; event: { kind: string; device_occurred_at: string; received_at: string; review_status: string }; event_count: number; approved_correction_id: string | null; approved_adjustment_count: number; compensated_regular_minutes: number; compensated_overtime_minutes: number; calculated_regular_minutes: number; calculated_overtime_minutes: number; suggested_regular_minutes_delta: number; suggested_overtime_minutes_delta: number; complete: boolean; exceptions: string[] } };
const now = new Date();

export default function HrTimesheetsPage() {
  const [periods, setPeriods] = useState<Period[]>([]); const [selectedId, setSelectedId] = useState(""); const [detail, setDetail] = useState<Detail | null>(null); const [adjustments, setAdjustments] = useState<Adjustment[]>([]); const [role, setRole] = useState("hr");
  const [year, setYear] = useState(now.getFullYear()); const [month, setMonth] = useState(now.getMonth() + 1); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const loadPeriods = useCallback(async () => { try { const [periodResult, me] = await Promise.all([apiRequest<ApiEnvelope<Period[]>>("/api/v1/hr/timesheet-periods"), apiRequest<ApiEnvelope<{ account: { role: string } }>>("/api/v1/me")]); setError(""); setPeriods(periodResult.data ?? []); setRole(me.data.account.role); setSelectedId(current => current || periodResult.data?.[0]?.id || ""); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không tải được kỳ công."); } finally { setLoading(false); } }, []);
  const loadDetail = useCallback(async (id: string) => { if (!id) return; try { const [result, adjustmentResult] = await Promise.all([apiRequest<ApiEnvelope<Detail>>("/api/v1/hr/timesheet-periods/" + id), apiRequest<ApiEnvelope<Adjustment[]>>("/api/v1/hr/timesheet-adjustments?period_id=" + id)]); setError(""); setDetail(result.data); setAdjustments(adjustmentResult.data ?? []); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không tải được chi tiết kỳ công."); setDetail(null); } }, []);
  useEffect(() => {
    let active = true;
    Promise.all([apiRequest<ApiEnvelope<Period[]>>("/api/v1/hr/timesheet-periods"), apiRequest<ApiEnvelope<{ account: { role: string } }>>("/api/v1/me")])
      .then(([periodResult, me]) => { if (!active) return; setError(""); setPeriods(periodResult.data ?? []); setRole(me.data.account.role); setSelectedId(current => current || periodResult.data?.[0]?.id || ""); })
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
  async function createPeriod(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); setMessage(""); try { const result = await apiRequest<ApiEnvelope<Period>>("/api/v1/hr/timesheet-periods", { method: "POST", body: JSON.stringify({ year: Number(year), month: Number(month) }) }); setMessage("Đã chọn kỳ công tháng " + String(result.data.month).padStart(2, "0") + "/" + result.data.year + "."); await loadPeriods(); setSelectedId(result.data.id); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không tạo được kỳ công."); } finally { setBusy(false); } }
  async function action(name: "recalculate" | "review" | "lock" | "unlock") {
    if (!detail) return;
    if ((name === "lock" || name === "unlock") && role !== "admin") return;
    let reason: string | undefined;
    if (name === "unlock") { reason = window.prompt("Lý do mở lại kỳ đã khóa:", "")?.trim(); if (!reason || reason.length < 3) { if (reason !== undefined) setError("Lý do cần ít nhất 3 ký tự."); return; } }
    setBusy(true); setError(""); setMessage("");
    try {
      const path = name === "unlock" ? "/api/v1/admin/timesheet-periods/" + detail.period.id + "/unlock" : "/api/v1/hr/timesheet-periods/" + detail.period.id + "/" + name;
      await apiRequest(path, { method: "POST", ...(name === "unlock" ? { body: JSON.stringify({ reason }) } : {}) });
      setMessage(name === "recalculate" ? "Đã tính lại và lưu phiên bản snapshot mới." : name === "review" ? "HR đã xác nhận đối soát kỳ." : name === "lock" ? "Admin đã khóa kỳ công." : "Admin đã mở lại kỳ công có ghi lý do.");
      await Promise.all([loadPeriods(), loadDetail(selectedId)]);
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không thể cập nhật trạng thái kỳ công."); }
    finally { setBusy(false); }
  }
  async function acknowledge(day: Day, issueCode: string) {
    const note = window.prompt("Ghi chú cách xử lý ngoại lệ “" + issueCode + "” của " + day.full_name_snapshot + ":", "");
    if (!note || note.trim().length < 3) { if (note !== null) setError("Ghi chú xử lý cần ít nhất 3 ký tự."); return; }
    setBusy(true); setError(""); setMessage("");
    try { await apiRequest("/api/v1/hr/timesheet-periods/" + selectedId + "/exceptions", { method: "POST", body: JSON.stringify({ day_id: day.id, issue_code: issueCode, note: note.trim() }) }); setMessage("Đã ghi nhận xử lý ngoại lệ."); await loadDetail(selectedId); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không ghi được xử lý ngoại lệ."); }
    finally { setBusy(false); }
  }
  async function download() {
    if (!selectedId) return;
    setError("");
    try { const response = await apiRequest<Response>("/api/v1/reports/timesheet.xlsx?period_id=" + selectedId); const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "marixa-timesheet-" + detail?.period.year + "-" + String(detail?.period.month).padStart(2, "0") + ".xlsx"; anchor.click(); URL.revokeObjectURL(url); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không xuất được Excel. Hãy tạo snapshot trước."); }
  }
  async function decideAdjustment(item: Adjustment, decision: "approved" | "rejected") {
    if (!item.preview) { setError(item.preview_error ?? "Chưa đối soát được kỳ gốc."); return; }
    const note = window.prompt(decision === "approved" ? "Ghi chú xác nhận điều chỉnh:" : "Lý do từ chối điều chỉnh:", "");
    if (!note || note.trim().length < 3) { if (note !== null) setError("Ghi chú cần ít nhất 3 ký tự."); return; }
    setBusy(true); setError(""); setMessage("");
    try { const result = await apiRequest<ApiEnvelope<Adjustment>>("/api/v1/hr/timesheet-adjustments", { method: "POST", body: JSON.stringify({ adjustment_id: item.id, decision, review_note: note.trim() }) }); setMessage(result.data.target_period_id !== selectedId ? "Đã xử lý; kỳ đích cũ đã đóng nên khoản điều chỉnh được chuyển sang kỳ mở tiếp theo." : "Đã xử lý điều chỉnh kỳ trước. Hãy tính lại snapshot kỳ đích."); await Promise.all([loadPeriods(), loadDetail(selectedId)]); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không xử lý được điều chỉnh."); }
    finally { setBusy(false); }
  }
  const acknowledged = new Set((detail?.exception_reviews ?? []).map(item => item.work_date + ":" + item.employee_id + ":" + item.issue_code));
  return <>
    <PageHeader title="Bảng công" description="Tạo kỳ, tính snapshot, ghi nhận xử lý ngoại lệ, HR đối soát và admin khóa kỳ. Kỳ đã khóa không bị âm thầm ghi đè." action={<Button type="button" variant="secondary" onClick={() => void loadPeriods()} disabled={loading}>Làm mới</Button>} />
    {error && <Notice kind="error">{error}</Notice>}{message && <Notice kind="success">{message}</Notice>}
    <Panel title="Chọn hoặc tạo kỳ" description="Tạo lại kỳ đã tồn tại sẽ mở đúng bản ghi hiện hữu.">
      <form className="toolbar" onSubmit={createPeriod}><Field label="Năm"><input type="number" min={2000} max={2200} value={year} onChange={e => setYear(Number(e.target.value))} /></Field><Field label="Tháng"><select value={month} onChange={e => setMonth(Number(e.target.value))}>{Array.from({ length: 12 }, (_, i) => i + 1).map(value => <option key={value} value={value}>{String(value).padStart(2, "0")}</option>)}</select></Field><Button type="submit" disabled={busy}>Mở kỳ</Button><Field label="Kỳ hiện có"><select value={selectedId} onChange={e => setSelectedId(e.target.value)}><option value="">Chọn kỳ công</option>{periods.map(period => <option key={period.id} value={period.id}>{String(period.month).padStart(2, "0")}/{period.year} · {period.status} · v{period.version}</option>)}</select></Field></form>
      {loading && <LoadingState label="Đang tải các kỳ công…" />}
    </Panel>
    {detail && <>
      <Panel title={"Kỳ " + String(detail.period.month).padStart(2, "0") + "/" + detail.period.year} description={"Snapshot phiên bản " + detail.period.version + " · " + detail.days.length + " dòng công"} action={<StatusBadge value={detail.period.status} />}>
        <div className="inline-actions">
          <Button type="button" variant="secondary" disabled={busy || detail.period.status !== "open"} onClick={() => void action("recalculate")}>Tính lại snapshot</Button>
          <Button type="button" variant="secondary" disabled={busy || detail.period.status !== "open" || detail.days.length === 0} onClick={() => void action("review")}>HR xác nhận đối soát</Button>
          {role === "admin" && <Button type="button" disabled={busy || detail.period.status !== "hr_reviewed"} onClick={() => void action("lock")}>Admin khóa kỳ</Button>}
          {role === "admin" && detail.period.status === "locked" && <Button type="button" variant="danger" disabled={busy} onClick={() => void action("unlock")}>Mở lại có lý do</Button>}
          <Button type="button" variant="secondary" disabled={detail.days.length === 0} onClick={() => void download()}>Tải Excel</Button>
        </div>
      </Panel>
      <Panel title="Snapshot theo ngày" description="Số phút thể hiện công thường, tăng ca và điều chỉnh kỳ trước riêng biệt.">
        {detail.days.length === 0 ? <EmptyState title="Chưa có snapshot" description="Chọn Tính lại snapshot để tạo dữ liệu kỳ từ event, phép, chính sách và lịch nghỉ hiện hành." /> : <TableWrap><table><thead><tr><th>Ngày</th><th>Nhân viên</th><th>Công thường</th><th>Tăng ca</th><th>Phép</th><th>Đi trễ / về sớm</th><th>Điều chỉnh kỳ trước</th><th>Ngoại lệ</th></tr></thead><tbody>{detail.days.map(day => <tr key={day.id}><td>{formatDate(day.work_date)}</td><td><strong>{day.full_name_snapshot}</strong><small>{day.employee_code_snapshot}{day.department_snapshot ? " · " + day.department_snapshot : ""}</small></td><td>{formatMinutes(day.regular_minutes)}</td><td>{formatMinutes(day.overtime_minutes)}<small>{day.overtime_kind === "automatic_rest_day" ? "Tự động ngày nghỉ" : day.overtime_kind === "approved_workday" ? "Đã duyệt ngày thường" : day.overtime_minutes ? "Snapshot cũ chưa phân loại" : ""}</small></td><td>{day.leave_days}</td><td>{day.late_minutes} / {day.early_minutes} phút</td><td>{day.previous_period_regular_adjustment || day.previous_period_overtime_adjustment ? <>{day.previous_period_regular_adjustment} / {day.previous_period_overtime_adjustment} phút<small>Kỳ nguồn {day.previous_period_source_period_id}</small></> : "—"}</td><td>{day.exceptions?.length ? <div className="exception-list">{day.exceptions.map(issue => <div key={issue}><span>{issue}</span>{acknowledged.has(day.work_date + ":" + day.employee_id + ":" + issue) ? <StatusBadge value="reviewed" /> : detail.period.status === "open" ? <Button type="button" variant="secondary" disabled={busy} onClick={() => void acknowledge(day, issue)}>Ghi chú xử lý</Button> : <StatusBadge value="needs_review" />}</div>)}</div> : "—"}</td></tr>)}</tbody></table></TableWrap>}
      </Panel>
      <Panel title="Điều chỉnh từ kỳ đã khóa" description="Các khoản chênh lệch được xét duyệt riêng và chỉ cộng vào snapshot kỳ đích đang mở.">
        {adjustments.length === 0 ? <EmptyState title="Không có điều chỉnh kỳ trước" /> : <TableWrap><table><thead><tr><th>Ngày gốc</th><th>Event và đối soát</th><th>Chênh lệch đề xuất (phút)</th><th>Trạng thái</th><th></th></tr></thead><tbody>{adjustments.map(item => <tr key={item.id}><td>{formatDate(item.work_date)}<small>Kỳ nguồn {item.source_period_id}</small></td><td>{item.preview ? <><small>{item.preview.event.kind === "check_in" ? "Chấm vào" : "Chấm ra"} · giờ thiết bị {item.preview.event.device_occurred_at ? new Date(item.preview.event.device_occurred_at).toLocaleString("vi-VN") : "—"}</small><small>Máy chủ nhận {new Date(item.preview.event.received_at).toLocaleString("vi-VN")}</small><small>Snapshot cũ: {item.preview.source_snapshot.regular_minutes} thường / {item.preview.source_snapshot.overtime_minutes} tăng ca</small><small>Tính lại: {item.preview.calculated_regular_minutes} thường / {item.preview.calculated_overtime_minutes} tăng ca · {item.preview.complete ? "đủ mốc" : "thiếu mốc"}</small><small>Đã bù: {item.preview.compensated_regular_minutes} thường / {item.preview.compensated_overtime_minutes} tăng ca ({item.preview.approved_adjustment_count} điều chỉnh)</small><small>{item.preview.approved_correction_id ? "Đã có đơn sửa công được duyệt" : "Chưa có đơn sửa công được duyệt"} · {item.preview.event_count} event gốc</small>{item.preview.exceptions.length > 0 && <small>Ngoại lệ: {item.preview.exceptions.join(", ")}</small>}</> : <small>{item.preview_error ?? item.source_event_id}</small>}</td><td>{item.preview ? `${item.preview.suggested_regular_minutes_delta} thường · ${item.preview.suggested_overtime_minutes_delta} tăng ca` : `${item.regular_minutes_delta} thường · ${item.overtime_minutes_delta} tăng ca`}<small>{item.reason}</small></td><td><StatusBadge value={item.status} />{item.review_note && <small>{item.review_note}</small>}</td><td>{item.status === "pending_review" && item.preview ? <div className="table-actions"><Button type="button" disabled={busy} onClick={() => void decideAdjustment(item, "approved")}>Xác nhận chênh lệch</Button><Button type="button" variant="danger" disabled={busy} onClick={() => void decideAdjustment(item, "rejected")}>Từ chối</Button></div> : "—"}</td></tr>)}</tbody></table></TableWrap>}
      </Panel>
    </>}
  </>;
}
