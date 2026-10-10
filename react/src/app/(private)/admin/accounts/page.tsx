"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button, EmptyState, Field, LoadingState, Notice, PageHeader, Panel, StatusBadge, TableWrap } from "@/components/ui";
import { Dialog } from "@/components/dialog";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";

type Person = { id: string; employee_code: string; full_name: string; work_email: string };
type Account = { id: string; employee_id: string; role: "employee" | "hr" | "admin"; status: "active" | "disabled"; must_change_password: boolean; created_at: string; employees: Person | Person[] | null };
type Employee = { id: string; employee_code: string; full_name: string; work_email: string; status: string };
function personOf(value: Account["employees"]) { return Array.isArray(value) ? value[0] ?? null : value; }
const roleName: Record<string, string> = { employee: "Nhân viên", hr: "Nhân sự", admin: "Quản trị viên" };

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]); const [employees, setEmployees] = useState<Employee[]>([]); const [employeeId, setEmployeeId] = useState(""); const [role, setRole] = useState<Account["role"]>("employee"); const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true); const [busyId, setBusyId] = useState(""); const [saving, setSaving] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [resetTarget, setResetTarget] = useState<Account | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const load = useCallback(async () => { try { const [accountResult, employeeResult] = await Promise.all([apiRequest<ApiEnvelope<Account[]>>("/api/v1/admin/accounts"), apiRequest<ApiEnvelope<Employee[]>>("/api/v1/hr/employees?page_size=100")]); setError(""); setAccounts(accountResult.data ?? []); setEmployees((employeeResult.data ?? []).filter(employee => employee.status === "active")); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không tải được dữ liệu tài khoản."); } finally { setLoading(false); } }, []);
  useEffect(() => {
    let active = true;
    Promise.all([apiRequest<ApiEnvelope<Account[]>>("/api/v1/admin/accounts"), apiRequest<ApiEnvelope<Employee[]>>("/api/v1/hr/employees?page_size=100")])
      .then(([accountResult, employeeResult]) => { if (!active) return; setError(""); setAccounts(accountResult.data ?? []); setEmployees((employeeResult.data ?? []).filter(employee => employee.status === "active")); })
      .catch((cause: unknown) => { if (active) setError(cause instanceof ApiError ? cause.message : "Không tải được dữ liệu tài khoản."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function create(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const employee = employees.find(item => item.id === employeeId); if (!employee) { setError("Chọn hồ sơ nhân viên đang hoạt động."); return; } setSaving(true); setError(""); setMessage(""); try { await apiRequest("/api/v1/admin/accounts", { method: "POST", body: JSON.stringify({ employee_id: employee.id, role, email: employee.work_email, temporary_password: password }) }); setPassword(""); setEmployeeId(""); setMessage("Đã cấp tài khoản; người dùng sẽ phải đổi mật khẩu ở lần đăng nhập đầu."); await load(); setCreateOpen(false); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không cấp được tài khoản."); } finally { setSaving(false); } }
  async function update(account: Account, change: { role?: Account["role"]; status?: Account["status"] }) { setBusyId(account.id); setError(""); setMessage(""); try { await apiRequest("/api/v1/admin/accounts/" + account.id, { method: "PATCH", body: JSON.stringify(change) }); setMessage("Đã cập nhật tài khoản."); await load(); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không cập nhật được tài khoản."); } finally { setBusyId(""); } }
  async function reset(account: Account) { const temporaryPassword = resetPassword; if (temporaryPassword.length < 12) { setError("Mật khẩu tạm cần ít nhất 12 ký tự."); return; } setBusyId(account.id); setError(""); setMessage(""); try { await apiRequest("/api/v1/admin/accounts/" + account.id + "/reset-password", { method: "POST", body: JSON.stringify({ temporary_password: temporaryPassword }) }); setMessage("Đã đặt lại mật khẩu; tài khoản sẽ phải đổi mật khẩu ở lần đăng nhập tiếp theo."); await load(); setResetPassword(""); setResetTarget(null); } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không đặt lại được mật khẩu."); } finally { setBusyId(""); } }
  const unassigned = employees.filter(employee => !accounts.some(account => account.employee_id === employee.id));
  return <>
    <PageHeader title="Tài khoản và phân quyền" description="Tài khoản Auth gắn với hồ sơ nhân viên. V1 hỗ trợ employee, HR và admin; không bật đăng ký công khai." action={<Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}>Làm mới</Button>} />
    {error && <Notice kind="error">{error}</Notice>}{message && <Notice kind="success">{message}</Notice>}
    <Button type="button" className="staff-create-account" onClick={() => { setError(""); setCreateOpen(true); }}>+ Cấp tài khoản</Button>
    {createOpen && <Dialog title="Cấp tài khoản" busy={saving} onClose={() => { setCreateOpen(false); setPassword(""); }}>{error && <Notice kind="error">{error}</Notice>}    <Panel title="Cấp tài khoản" description="Email được lấy từ hồ sơ nhân viên. Mật khẩu tạm chỉ gửi một lần; yêu cầu tối thiểu 12 ký tự.">
      {unassigned.length === 0 ? <EmptyState title="Không có hồ sơ chưa cấp tài khoản" description="Tạo hồ sơ nhân viên hoặc tải lại danh sách." /> : <form className="form-grid" onSubmit={create}>
        <Field label="Nhân viên"><select required value={employeeId} onChange={e => setEmployeeId(e.target.value)}><option value="">Chọn nhân viên</option>{unassigned.map(employee => <option key={employee.id} value={employee.id}>{employee.employee_code} · {employee.full_name} · {employee.work_email}</option>)}</select></Field>
        <Field label="Vai trò"><select value={role} onChange={e => setRole(e.target.value as Account["role"])}><option value="employee">Nhân viên</option><option value="hr">Nhân sự</option><option value="admin">Quản trị viên</option></select></Field>
        <Field label="Mật khẩu tạm"><input type="password" required minLength={12} maxLength={128} autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
        <div className="form-actions"><Button type="submit" disabled={saving}>{saving ? "Đang cấp…" : "Cấp tài khoản"}</Button></div>
      </form>}
    </Panel></Dialog>}
    <Panel title="Tài khoản đã cấp" description="Thay đổi vai trò, khóa/mở tài khoản hoặc yêu cầu đổi mật khẩu.">
      {loading ? <LoadingState /> : accounts.length === 0 ? <EmptyState title="Chưa có tài khoản" /> : <TableWrap><table><thead><tr><th>Nhân viên</th><th>Vai trò</th><th>Trạng thái</th><th>Mật khẩu</th><th>Thao tác</th></tr></thead><tbody>{accounts.map(account => { const person = personOf(account.employees); return <tr key={account.id}><td data-label="Nhân viên"><strong>{person?.full_name ?? "Hồ sơ nhân viên"}</strong><small>{person?.employee_code ?? account.employee_id} · {person?.work_email ?? ""}</small></td><td data-label="Vai trò"><select aria-label="Vai trò" value={account.role} disabled={busyId === account.id} onChange={e => void update(account, { role: e.target.value as Account["role"] })}><option value="employee">{roleName.employee}</option><option value="hr">{roleName.hr}</option><option value="admin">{roleName.admin}</option></select></td><td data-label="Trạng thái"><StatusBadge value={account.status} /></td><td data-label="Mật khẩu">{account.must_change_password ? "Cần đổi mật khẩu" : "Đã thiết lập"}</td><td data-label="Thao tác"><div className="table-actions"><Button type="button" variant="secondary" disabled={busyId === account.id} onClick={() => { setError(""); setResetPassword(""); setResetTarget(account); }}>Đặt lại mật khẩu</Button><Button type="button" variant={account.status === "active" ? "danger" : "secondary"} disabled={busyId === account.id} onClick={() => void update(account, { status: account.status === "active" ? "disabled" : "active" })}>{account.status === "active" ? "Khóa" : "Mở khóa"}</Button></div></td></tr>; })}</tbody></table></TableWrap>}
    </Panel>
    {resetTarget && <Dialog title="Đặt lại mật khẩu" busy={Boolean(busyId)} onClose={() => { setResetTarget(null); setResetPassword(""); }}><p>{personOf(resetTarget.employees)?.full_name ?? "Nhân viên"}</p><p>Tài khoản sẽ phải đổi mật khẩu ở lần đăng nhập tiếp theo.</p>{error && <Notice kind="error">{error}</Notice>}<form onSubmit={event => { event.preventDefault(); void reset(resetTarget); }}><Field label="Mật khẩu tạm mới" hint="Tối thiểu 12 ký tự."><input type="password" required minLength={12} maxLength={128} autoComplete="new-password" disabled={Boolean(busyId)} value={resetPassword} onChange={event => setResetPassword(event.target.value)} /></Field><div className="form-actions"><Button type="submit" disabled={Boolean(busyId)}>{busyId ? "Đang lưu…" : "Đặt lại mật khẩu"}</Button></div></form></Dialog>}
  </>;
}
