"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Button, EmptyState, Field, LoadingState, Notice, PageHeader, Panel, StatusBadge, TableWrap } from "@/components/ui";
import { MobileFilters } from "@/components/mobile-filters";
import { ApiError, apiRequest, type ApiEnvelope } from "@/lib/api-client";
import { formatDate } from "@/lib/format";
import { Dialog } from "@/components/dialog";

type Employee = { id: string; employee_code: string; full_name: string; work_email: string; phone: string | null; department: string | null; job_title: string | null; hire_date: string | null; status: string };
type EmployeeForm = { employee_code: string; full_name: string; work_email: string; phone: string; department: string; job_title: string; hire_date: string };
type ImportRowResult = { rowNumber: number; employeeCode: string; fullName: string; status: "created" | "updated" | "skipped" | "error"; issues: string[] };
type ImportResult = { total: number; created: number; updated: number; skipped: number; errors: number; rows: ImportRowResult[] };
const blank: EmployeeForm = { employee_code: "", full_name: "", work_email: "", phone: "", department: "", job_title: "", hire_date: "" };

const ROW_LABEL: Record<ImportRowResult["status"], string> = {
  created: "Đã tạo",
  updated: "Đã cập nhật",
  skipped: "Bỏ qua (dòng trống)",
  error: "Có lỗi",
};

export default function HrEmployeesPage() {
  const [rows, setRows] = useState<Employee[]>([]); const [query, setQuery] = useState("");
  const [form, setForm] = useState<EmployeeForm>(blank); const [editing, setEditing] = useState<Employee | null>(null);
  const [showForm, setShowForm] = useState(false); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false);
  const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false); const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const load = useCallback(async (q = query) => {
    try { const params = new URLSearchParams({ page_size: "100" }); if (q.trim()) params.set("q", q.trim()); const result = await apiRequest<ApiEnvelope<Employee[]>>("/api/v1/hr/employees?" + params); setError(""); setRows(result.data ?? []); }
    catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không tải được hồ sơ nhân viên."); }
    finally { setLoading(false); }
  }, [query]);
  useEffect(() => {
    let active = true;
    apiRequest<ApiEnvelope<Employee[]>>("/api/v1/hr/employees?page_size=100")
      .then(result => { if (active) { setError(""); setRows(result.data ?? []); } })
      .catch((cause: unknown) => { if (active) setError(cause instanceof ApiError ? cause.message : "Không tải được hồ sơ nhân viên."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  function openCreate() { setEditing(null); setForm(blank); setShowForm(true); setError(""); setMessage(""); }
  function openEdit(employee: Employee) { setEditing(employee); setForm({ employee_code: employee.employee_code, full_name: employee.full_name, work_email: employee.work_email, phone: employee.phone ?? "", department: employee.department ?? "", job_title: employee.job_title ?? "", hire_date: employee.hire_date ?? "" }); setShowForm(true); setError(""); setMessage(""); }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const body = { full_name: form.full_name.trim(), work_email: form.work_email.trim(), phone: form.phone.trim() || null, department: form.department.trim() || null, job_title: form.job_title.trim() || null, hire_date: form.hire_date || null };
    try {
      if (editing) await apiRequest("/api/v1/hr/employees/" + editing.id, { method: "PATCH", body: JSON.stringify(body) });
      else await apiRequest("/api/v1/hr/employees", { method: "POST", body: JSON.stringify({ ...body, employee_code: form.employee_code.trim() }) });
      setShowForm(false); setMessage(editing ? "Đã cập nhật hồ sơ nhân viên." : "Đã tạo hồ sơ nhân viên."); await load();
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không lưu được hồ sơ."); }
    finally { setSaving(false); }
  }
  async function search(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await load(query); }
  async function downloadUrl(path: string, filename: string) {
    setError("");
    try {
      const response = await apiRequest<Response>(path);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = filename; anchor.click();
      URL.revokeObjectURL(url);
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không tải được file."); }
  }
  async function submitImport() {
    const file = fileRef.current?.files?.[0];
    if (!file) { setError("Hãy chọn file .xlsx để import."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const formdata = new FormData();
      formdata.append("file", file);
      const result = await apiRequest<ApiEnvelope<ImportResult>>("/api/v1/hr/employees/import.xlsx", { method: "POST", body: formdata });
      setImportResult(result.data ?? null);
      if (fileRef.current) fileRef.current.value = "";
      await load();
    } catch (cause) { setError(cause instanceof ApiError ? cause.message : "Không import được danh sách."); }
    finally { setBusy(false); }
  }
  const visibleRows = importResult?.rows.filter(row => row.status !== "skipped") ?? [];
  return <>
    <PageHeader title="Hồ sơ nhân viên" description="HR quản lý hồ sơ công việc; tài khoản đăng nhập và vai trò được cấp riêng bởi admin." action={<>
      <Button type="button" variant="secondary" onClick={() => void downloadUrl("/api/v1/hr/employees/export.xlsx", "marixa-nhan-vien.xlsx")}>Xuất danh sách</Button>
      <Button type="button" variant="secondary" onClick={() => void downloadUrl("/api/v1/hr/employees/template.xlsx", "mau-nhan-vien.xlsx")}>Tải mẫu</Button>
      <label className="button button-primary upload-button">
        {busy ? "Đang import…" : "Import danh sách"}
        <input ref={fileRef} type="file" accept=".xlsx" disabled={busy} style={{ display: "none" }} onChange={() => { if (fileRef.current?.files?.[0]) void submitImport(); }} />
      </label>
      <Button type="button" onClick={openCreate}>Thêm nhân viên</Button>
    </>} />
    {error && <Notice kind="error">{error}</Notice>}{message && <Notice kind="success">{message}</Notice>}
    {!loading && <div className="hr-kpi-row reference-hr-kpis"><div className="hr-card hr-card--ok"><div className="hr-card-head"><span className="hr-card-icon" aria-hidden="true">♙</span>Đang làm việc</div><p className="hr-card-sub">Trong danh sách đang hiển thị</p><div className="hr-card-value"><strong>{rows.filter(employee => employee.status === "active").length}</strong><span className="hr-card-of">/ {rows.length}</span></div></div><div className="hr-card hr-card--warn"><div className="hr-card-head"><span className="hr-card-icon" aria-hidden="true">◷</span>Không hoạt động</div><p className="hr-card-sub">Hồ sơ tạm nghỉ hoặc đã nghỉ</p><div className="hr-card-value"><strong>{rows.filter(employee => employee.status !== "active").length}</strong><span className="hr-card-of">/ {rows.length}</span></div></div></div>}
    {showForm && <Dialog title={editing ? "Cập nhật hồ sơ" : "Tạo hồ sơ nhân viên"} busy={saving} onClose={() => setShowForm(false)}>
      <p className="subtle-note">Email cần khớp với email công việc sẽ dùng khi admin cấp tài khoản.</p>
      {error && <Notice kind="error">{error}</Notice>}
      <form className="form-grid" onSubmit={submit}>
        {!editing && <Field label="Mã nhân viên"><input required maxLength={30} value={form.employee_code} onChange={e => setForm({ ...form, employee_code: e.target.value })} /></Field>}
        <Field label="Họ và tên"><input required minLength={2} maxLength={160} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></Field>
        <Field label="Email công việc"><input required type="email" maxLength={254} value={form.work_email} onChange={e => setForm({ ...form, work_email: e.target.value })} /></Field>
        <Field label="Số điện thoại"><input maxLength={30} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Phòng ban"><input maxLength={100} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} /></Field>
        <Field label="Chức danh"><input maxLength={120} value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} /></Field>
        <Field label="Ngày vào làm"><input type="date" value={form.hire_date} onChange={e => setForm({ ...form, hire_date: e.target.value })} /></Field>
        <div className="form-actions full"><Button type="submit" disabled={saving}>{saving ? "Đang lưu…" : "Lưu hồ sơ"}</Button><Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Đóng</Button></div>
      </form>
    </Dialog>}
    {importResult && <Dialog title="Kết quả import danh sách nhân viên" onClose={() => setImportResult(null)}>
      <Notice kind={importResult.errors > 0 ? "warning" : "success"}>
        Đã xử lý {importResult.total} dòng: <strong>{importResult.created}</strong> tạo mới · <strong>{importResult.updated}</strong> cập nhật · <strong>{importResult.skipped}</strong> bỏ qua · <strong>{importResult.errors}</strong> lỗi.
      </Notice>
      {visibleRows.length > 0 && <Panel title="Chi tiết từng dòng" description="Chỉ hiện các dòng có nội dung.">
        <TableWrap><table><thead><tr><th>Dòng</th><th>Mã</th><th>Họ tên</th><th>Kết quả</th><th>Lỗi</th></tr></thead><tbody>
          {visibleRows.map(row => <tr key={row.rowNumber}>
            <td data-label="Dòng">Hàng {row.rowNumber}</td>
            <td data-label="Mã">{row.employeeCode || "—"}</td>
            <td data-label="Họ tên">{row.fullName || "—"}</td>
            <td data-label="Kết quả"><span className={`badge ${row.status === "error" ? "badge-negative" : "badge-positive"}`}>{ROW_LABEL[row.status]}</span></td>
            <td data-label="Lỗi">{row.issues.length ? <ul className="import-issue-list">{row.issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul> : "—"}</td>
          </tr>)}
        </tbody></table></TableWrap>
      </Panel>}
      {importResult.errors === 0 && visibleRows.length === 0 && <Notice kind="success">File không có dữ liệu hợp lệ để import.</Notice>}
      <div className="form-actions"><Button type="button" onClick={() => setImportResult(null)}>Đóng</Button></div>
    </Dialog>}
    <Panel title="Danh sách" description={rows.length + " hồ sơ đang hiển thị · tối đa 100 hồ sơ mỗi lượt tải"}>
      <MobileFilters><form className="toolbar" onSubmit={search}><label className="field"><span>Tìm mã, tên, email hoặc phòng ban</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Ví dụ: NV001 hoặc Kế toán" /></label><Button type="submit" variant="secondary" disabled={loading}>Tìm kiếm</Button></form></MobileFilters>
      {loading ? <LoadingState /> : rows.length === 0 ? <EmptyState title="Chưa có hồ sơ phù hợp" description="Thêm hồ sơ nhân viên, import danh sách hoặc thay đổi từ khóa tìm kiếm." /> : <TableWrap><table><thead><tr><th>Mã / nhân viên</th><th>Liên hệ</th><th>Phòng ban / chức danh</th><th>Ngày vào làm</th><th>Trạng thái</th><th></th></tr></thead><tbody>{rows.map(employee => <tr key={employee.id}><td data-label="Mã / nhân viên"><strong>{employee.employee_code}</strong><small>{employee.full_name}</small></td><td data-label="Liên hệ">{employee.work_email}<small>{employee.phone || "Chưa có số điện thoại"}</small></td><td data-label="Phòng ban / chức danh">{employee.department || "—"}<small>{employee.job_title || "—"}</small></td><td data-label="Ngày vào làm">{formatDate(employee.hire_date)}</td><td data-label="Trạng thái"><StatusBadge value={employee.status} /></td><td data-label="Thao tác"><Button type="button" variant="secondary" onClick={() => openEdit(employee)}>Sửa</Button></td></tr>)}</tbody></table></TableWrap>}
    </Panel>
  </>;
}
