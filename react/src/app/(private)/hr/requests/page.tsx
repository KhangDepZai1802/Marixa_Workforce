"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, EmptyState, Field, LoadingState, Notice, PageHeader, Panel, TableWrap } from "@/components/ui";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { formatDate, formatDateTime, formatTime } from "@/lib/format";

type Person = { employee_code: string; full_name: string };
type RequestItem = { id: string; employee_id: string; can_decide: boolean; created_at: string; reason: string; employees: Person | Person[] | null; [key: string]: unknown };
type RequestData = { leave: RequestItem[]; overtime: RequestItem[]; corrections: RequestItem[] };
type Kind = keyof RequestData;
const title: Record<Kind, string> = { leave: "Nghỉ phép", overtime: "Tăng ca", corrections: "Sửa công" };
function personOf(value: RequestItem["employees"]) { return Array.isArray(value) ? value[0] ?? null : value; }

export default function HrRequestsPage() {
  const [data, setData] = useState<RequestData>({ leave: [], overtime: [], corrections: [] }); const [kind, setKind] = useState<Kind>("leave");
  const [notes, setNotes] = useState<Record<string, string>>({}); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(""); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const load = useCallback(async () => { try { const result = await apiRequest<ApiEnvelope<RequestData>>("/api/v1/hr/requests"); setError(""); setData(result.data); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không tải được hàng đợi duyệt."); } finally { setLoading(false); } }, []);
  useEffect(() => {
    let active = true;
    apiRequest<ApiEnvelope<RequestData>>("/api/v1/hr/requests")
      .then(result => { if (active) { setError(""); setData(result.data); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof ApiError ? cause.message : "Không tải được hàng đợi duyệt."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function decide(item: RequestItem, decision: "approved" | "rejected") {
    const note = (notes[item.id] ?? "").trim();
    if (decision === "rejected" && note.length < 3) { setError("Nhập ghi chú từ chối từ 3 ký tự trở lên."); return; }
    setBusy(item.id); setError(""); setMessage("");
    try { await apiRequest("/api/v1/requests/" + (kind === "corrections" ? "correction" : kind) + "/" + item.id + "/decision", { method: "POST", body: JSON.stringify({ decision, note: note || undefined }) }); setMessage("Đã " + (decision === "approved" ? "duyệt" : "từ chối") + " yêu cầu."); await load(); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không lưu được quyết định."); }
    finally { setBusy(""); }
  }
  const rows = data[kind] ?? [];
  return <>
    <PageHeader title="Duyệt yêu cầu" description="Quyết định được ghi nhận qua API và lưu nhật ký nghiệp vụ. Bạn không thể tự duyệt yêu cầu của chính mình." action={<Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>Làm mới</Button>} />
    {error && <Notice kind="error">{error}</Notice>}{message && <Notice kind="success">{message}</Notice>}
    <Panel title="Hàng đợi duyệt" description="Tối đa 100 yêu cầu đang chờ cho mỗi loại.">
      <div className="tabs" role="tablist" aria-label="Loại yêu cầu">{(Object.keys(title) as Kind[]).map(value => <button key={value} className="tab-button" role="tab" aria-selected={kind === value} type="button" onClick={() => setKind(value)}>{title[value]} ({data[value].length})</button>)}</div>
      {loading ? <LoadingState /> : rows.length === 0 ? <EmptyState title="Không có yêu cầu đang chờ" description="Các yêu cầu mới gửi sẽ xuất hiện ở đây." /> : <TableWrap><table><thead><tr><th>Nhân viên</th><th>Chi tiết</th><th>Lý do</th><th>Gửi lúc</th><th>Quyết định</th></tr></thead><tbody>{rows.map(item => { const person = personOf(item.employees); return <tr key={item.id}>
        <td><strong>{person?.full_name ?? "Nhân viên"}</strong><small>{person?.employee_code ?? item.employee_id}</small></td>
        <td>{kind === "leave" ? <>{formatDate(String(item.start_date ?? ""))} – {formatDate(String(item.end_date ?? ""))}<small>{Number(item.total_days ?? 0)} ngày · {String((item.leave_types as { name?: string } | null)?.name ?? "Nghỉ phép")}</small></> : kind === "overtime" ? <>{formatDate(String(item.work_date ?? ""))}<small>{formatTime(String(item.start_at ?? ""))} – {formatTime(String(item.end_at ?? ""))}</small></> : <>{formatDate(String(item.work_date ?? ""))}<small>Vào: {formatTime(String(item.proposed_check_in ?? ""))} · Ra: {formatTime(String(item.proposed_check_out ?? ""))}</small></>}</td>
        <td>{item.reason || "—"}</td><td>{formatDateTime(item.created_at)}</td>
        <td>{item.can_decide ? <div className="review-controls"><Field label="Ghi chú quyết định"><input value={notes[item.id] ?? ""} onChange={e => setNotes({ ...notes, [item.id]: e.target.value })} placeholder="Bắt buộc nếu từ chối" maxLength={2000} /></Field><div className="table-actions"><Button type="button" disabled={busy === item.id} onClick={() => void decide(item, "approved")}>Duyệt</Button><Button type="button" variant="danger" disabled={busy === item.id} onClick={() => void decide(item, "rejected")}>Từ chối</Button></div></div> : <span className="muted-text">Không thể tự duyệt yêu cầu này.</span>}</td>
      </tr>; })}</tbody></table></TableWrap>}
    </Panel>
  </>;
}
