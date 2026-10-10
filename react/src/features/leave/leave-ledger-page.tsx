"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { Button, EmptyState, Field, LoadingState, Notice, PageHeader, Panel, TableWrap } from "@/components/ui";

type Employee = { id: string; employee_code: string; full_name: string; status: string };
type Entry = { id: string; employee_id: string; year: number; amount_days: number; entry_type: string; reason: string | null; created_at: string; employees: { employee_code: string; full_name: string } | { employee_code: string; full_name: string }[] | null };
type LedgerResponse = ApiEnvelope<Entry[]> & { balances: Record<string, number>; year: number };
function employeeOf(value: Entry["employees"]) { return Array.isArray(value) ? value[0] ?? null : value; }
const entryLabel: Record<string, string> = { grant: "Cấp phép", carryover: "Chuyển phép", adjustment: "Điều chỉnh" };

export function LeaveLedgerPage() {
  const [employees, setEmployees] = useState<Employee[]>([]); const [entries, setEntries] = useState<Entry[]>([]); const [balances, setBalances] = useState<Record<string, number>>({});
  const [employeeId, setEmployeeId] = useState(""); const [year, setYear] = useState(new Date().getFullYear()); const [amount, setAmount] = useState("1"); const [entryType, setEntryType] = useState("grant"); const [reason, setReason] = useState("");
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
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!employeeId || !Number.isFinite(Number(amount)) || Number(amount) === 0 || reason.trim().length < 3) { setError("Chọn nhân viên, nhập số ngày khác 0 và ghi lý do ít nhất 3 ký tự."); return; } setSaving(true); setError(""); setMessage(""); try { await apiRequest("/api/v1/admin/leave-ledger", { method: "POST", body: JSON.stringify({ employee_id: employeeId, year, amount_days: Number(amount), entry_type: entryType, reason: reason.trim() }) }); setMessage("Đã ghi giao dịch sổ phép. Giao dịch không bị xóa hoặc sửa trực tiếp."); setReason(""); await load(); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không ghi được giao dịch phép."); } finally { setSaving(false); } }
  return <>
    <PageHeader title="Sổ phép năm" description="Mọi số dư là tổng giao dịch có lý do. Giao dịch cấp/chuyển/điều chỉnh được giữ lịch sử và audit; đơn đã duyệt tự ghi nhận phần trừ/hoàn." action={<Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>Làm mới</Button>} />
    {error && <Notice kind="error">{error}</Notice>}{message && <Notice kind="success">{message}</Notice>}
    <Panel title="Ghi giao dịch phép" description="Dùng cho số dư lịch sử, chuyển phép hoặc điều chỉnh thủ công; không dùng để cấp sẵn 12 ngày mỗi năm.">
      <form className="form-grid" onSubmit={submit}><Field label="Nhân viên"><select required value={employeeId} onChange={e => setEmployeeId(e.target.value)}><option value="">Chọn nhân viên</option>{employees.map(employee => <option key={employee.id} value={employee.id}>{employee.employee_code} · {employee.full_name}</option>)}</select></Field><Field label="Năm phép"><input required type="number" min={2000} max={2200} value={year} onChange={e => setYear(Number(e.target.value))} /></Field><Field label="Số ngày (+ cấp, − giảm)"><input required type="number" step="0.5" min="-365" max="365" value={amount} onChange={e => setAmount(e.target.value)} /></Field><Field label="Loại giao dịch"><select value={entryType} onChange={e => setEntryType(e.target.value)}><option value="grant">Cấp phép</option><option value="carryover">Chuyển phép</option><option value="adjustment">Điều chỉnh</option></select></Field><Field label="Lý do"><input required minLength={3} maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} /></Field><div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Đang ghi…" : "Ghi giao dịch"}</Button></div></form>
    </Panel>
    <Panel title={"Số dư năm " + year} description="Số dư tính từ các giao dịch sổ phép, không phải giá trị nhập tay.">
      {loading ? <LoadingState /> : <TableWrap><table><thead><tr><th>Nhân viên</th><th>Số dư</th></tr></thead><tbody>{employees.map(employee => <tr key={employee.id}><td data-label="Nhân viên">{employee.employee_code} · {employee.full_name}</td><td data-label="Số dư"><strong>{Number(balances[employee.id] ?? 0).toLocaleString("vi-VN")} ngày</strong></td></tr>)}</tbody></table></TableWrap>}
    </Panel>
    <Panel title="Giao dịch gần đây" description={entries.length + " giao dịch đang hiển thị, tối đa 500."}>
      {loading ? <LoadingState /> : entries.length === 0 ? <EmptyState title="Chưa có giao dịch trong năm này" /> : <TableWrap><table><thead><tr><th>Nhân viên</th><th>Loại</th><th>Số ngày</th><th>Lý do</th><th>Ngày ghi nhận</th></tr></thead><tbody>{entries.map(entry => { const person = employeeOf(entry.employees); return <tr key={entry.id}><td data-label="Nhân viên"><strong>{person?.full_name ?? entry.employee_id}</strong><small>{person?.employee_code ?? ""}</small></td><td data-label="Loại">{entryLabel[entry.entry_type] ?? entry.entry_type}</td><td data-label="Số ngày">{Number(entry.amount_days).toLocaleString("vi-VN")}</td><td data-label="Lý do">{entry.reason || "—"}</td><td data-label="Ngày ghi nhận">{formatDateTime(entry.created_at)}</td></tr>; })}</tbody></table></TableWrap>}
    </Panel>
  </>;
}
