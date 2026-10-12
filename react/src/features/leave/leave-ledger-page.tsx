"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { Dialog } from "@/components/dialog";
import { useQueryState } from "@/lib/use-query-state";
import { businessDate, formatDateTime } from "@/lib/format";
import { Button, EmptyState, Field, LoadingState, Notice, PageHeader, Panel, TableWrap } from "@/components/ui";

type Employee = { id: string; employee_code: string; full_name: string; status: string };
type Entry = { id: string; employee_id: string; year: number; amount_days: number; entry_type: string; reason: string | null; created_at: string; employees: { employee_code: string; full_name: string } | { employee_code: string; full_name: string }[] | null };
type LedgerResponse = ApiEnvelope<Entry[]> & { balances: Record<string, number>; year: number };
function employeeOf(value: Entry["employees"]) { return Array.isArray(value) ? value[0] ?? null : value; }
const entryLabel: Record<string, string> = { monthly_accrual: "Cấp phép tháng", deduction: "Trừ phép đã duyệt", reversal: "Hoàn phép", historical_used: "Phép đã dùng trước đây", grant: "Cấp phép", carryover: "Chuyển phép", adjustment: "Điều chỉnh" };

export function LeaveLedgerPage() {
  const { params, updateQuery } = useQueryState();
  const parsedYear = Number(params.get("year"));
  const year = parsedYear >= 2000 && parsedYear <= 2200 ? parsedYear : Number(businessDate().slice(0, 4));
  const [formOpen, setFormOpen] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]); const [entries, setEntries] = useState<Entry[]>([]); const [balances, setBalances] = useState<Record<string, number>>({});
  const [employeeId, setEmployeeId] = useState(""); const [amount, setAmount] = useState("1"); const [entryType, setEntryType] = useState("grant"); const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const load = useCallback(async (targetYear = year) => { try { const [employeeResult, ledger] = await Promise.all([apiRequest<ApiEnvelope<Employee[]>>("/api/v1/hr/employees?page_size=100"), apiRequest<LedgerResponse>("/api/v1/admin/leave-ledger?year=" + targetYear)]); setError(""); setEmployees((employeeResult.data ?? []).filter(employee => employee.status === "active")); setEntries(ledger.data ?? []); setBalances(ledger.balances ?? {}); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không đọc được sổ phép."); } finally { setLoading(false); } }, [year]);
  useEffect(() => {
    let active = true;
    Promise.all([apiRequest<ApiEnvelope<Employee[]>>("/api/v1/hr/employees?page_size=100"), apiRequest<LedgerResponse>("/api/v1/admin/leave-ledger?year=" + year)])
      .then(([employeeResult, ledger]) => { if (active) { setError(""); setEmployees((employeeResult.data ?? []).filter(employee => employee.status === "active")); setEntries(ledger.data ?? []); setBalances(ledger.balances ?? {}); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof ApiError ? cause.message : "Không đọc được sổ phép."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [year]);
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!employeeId || !Number.isFinite(Number(amount)) || Number(amount) === 0 || reason.trim().length < 3) { setError("Chọn nhân viên, nhập số ngày khác 0 và ghi lý do ít nhất 3 ký tự."); return; } setSaving(true); setError(""); setMessage(""); try { await apiRequest("/api/v1/admin/leave-ledger", { method: "POST", body: JSON.stringify({ employee_id: employeeId, year, amount_days: Number(amount), entry_type: entryType, reason: reason.trim() }) }); setMessage("Đã ghi giao dịch sổ phép. Giao dịch không bị xóa hoặc sửa trực tiếp."); setReason(""); setFormOpen(false); await load(); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không ghi được giao dịch phép."); } finally { setSaving(false); } }
  const pageCount = Math.max(1, Math.ceil(entries.length / 20));
  const page = Math.min(pageCount, Math.max(1, Number(params.get("page")) || 1));
  const visible = entries.slice((page - 1) * 20, page * 20);
  return <>
    <PageHeader title="Sổ phép năm" description="Theo dõi số dư phép và lịch sử cấp, trừ, hoàn phép của nhân viên." action={<div className="inline-actions"><Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>Làm mới</Button><Button type="button" onClick={() => { setError(""); setFormOpen(true); }}>Ghi giao dịch phép</Button></div>} />
    {error && <Notice kind="error">{error}</Notice>}{message && <Notice kind="success">{message}</Notice>}
    <div className="toolbar"><Field label="Năm phép"><select value={year} onChange={event => updateQuery({ year: event.target.value, page: null })}>{Array.from(new Set([year - 1, year, year + 1, Number(businessDate().slice(0, 4))])).sort().map(value => <option key={value} value={value}>{value}</option>)}</select></Field></div>
    {formOpen && <Dialog title={"Ghi giao dịch phép năm " + year} busy={saving} onClose={() => setFormOpen(false)}><p>Dùng cho số dư lịch sử, chuyển phép hoặc điều chỉnh thủ công; không cấp sẵn 12 ngày mỗi năm.</p>{error && <Notice kind="error">{error}</Notice>}
      <form className="form-grid" onSubmit={submit}><Field label="Nhân viên"><select required value={employeeId} onChange={e => setEmployeeId(e.target.value)}><option value="">Chọn nhân viên</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.employee_code} · {employee.full_name}</option>)}</select></Field><Field label="Số ngày (+ cấp, − giảm)"><input required type="number" step="0.5" min="-365" max="365" value={amount} onChange={e => setAmount(e.target.value)} /></Field><Field label="Loại giao dịch"><select value={entryType} onChange={e => setEntryType(e.target.value)}><option value="grant">Cấp phép</option><option value="carryover">Chuyển phép</option><option value="adjustment">Điều chỉnh</option></select></Field><Field label="Lý do"><input required minLength={3} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></Field><div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Đang ghi…" : "Ghi giao dịch"}</Button></div></form>
    </Dialog>}
    <Panel title={"Số dư năm " + year} description="Số dư tính từ các giao dịch sổ phép, không phải giá trị nhập tay.">
      {loading ? <LoadingState /> : <TableWrap><table><thead><tr><th>Nhân viên</th><th>Số dư</th></tr></thead><tbody>{employees.map(employee => <tr key={employee.id}><td data-label="Nhân viên">{employee.employee_code} · {employee.full_name}</td><td data-label="Số dư"><strong>{Number(balances[employee.id] ?? 0).toLocaleString("vi-VN")} ngày</strong></td></tr>)}</tbody></table></TableWrap>}
    </Panel>
    <Panel title="Giao dịch gần đây" description={entries.length + " giao dịch đang hiển thị, tối đa 500."}>
      {loading ? <LoadingState /> : entries.length === 0 ? <EmptyState title="Chưa có giao dịch trong năm này" /> : <TableWrap><table><thead><tr><th>Nhân viên</th><th>Loại</th><th>Số ngày</th><th>Lý do</th><th>Ngày ghi nhận</th></tr></thead><tbody>{visible.map(entry => { const person = employeeOf(entry.employees); return <tr key={entry.id}><td data-label="Nhân viên"><strong>{person?.full_name ?? entry.employee_id}</strong><small>{person?.employee_code ?? ""}</small></td><td data-label="Loại">{entryLabel[entry.entry_type] ?? entry.entry_type}</td><td data-label="Số ngày">{Number(entry.amount_days).toLocaleString("vi-VN")}</td><td data-label="Lý do">{entry.reason || "—"}</td><td data-label="Ngày ghi nhận">{formatDateTime(entry.created_at)}</td></tr>; })}</tbody></table></TableWrap>}
      <footer className="reference-pagination"><span>Trang {page} / {pageCount}</span><div><Button type="button" variant="secondary" disabled={page === 1} onClick={() => updateQuery({ page: String(page - 1) })}>Trước</Button><Button type="button" variant="secondary" disabled={page === pageCount} onClick={() => updateQuery({ page: String(page + 1) })}>Sau</Button></div></footer>
    </Panel>
  </>;
}
