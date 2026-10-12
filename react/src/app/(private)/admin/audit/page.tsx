"use client";

import { useState } from "react";
import { Button, EmptyState, Field, LoadingState, Notice, PageHeader, Panel, TableWrap } from "@/components/ui";
import { Dialog } from "@/components/dialog";
import { useQueryState } from "@/lib/use-query-state";
import { useResource } from "@/lib/use-resource";
import { formatDateTime, labelStatus } from "@/lib/format";
import { roleLabels, type Role } from "@/lib/navigation";

type Audit = { id: string; actor_user_id: string | null; action: string; entity_type: string; entity_id: string | null; before_json: unknown; after_json: unknown; reason: string | null; created_at: string };
type Account = { id: string; employees: { full_name: string; employee_code: string } | { full_name: string; employee_code: string }[] | null };
const entities: Record<string, string> = { app_user: "Tài khoản", employee: "Nhân viên", attendance_event: "Lượt chấm công", leave_request: "Đơn nghỉ phép", overtime_request: "Đơn tăng ca", attendance_correction: "Đơn sửa công", timesheet_period: "Kỳ công", timesheet_day: "Công theo ngày", timesheet_adjustment: "Điều chỉnh công", leave_ledger: "Sổ phép", work_policy: "Quy định giờ làm", holiday: "Ngày nghỉ", office: "Văn phòng", attendance_photo_batch: "Ảnh chấm công" };
const groups: Record<string, string> = { account: "Tài khoản", leave: "Nghỉ phép", overtime: "Tăng ca", attendance: "Chấm công", attendance_correction: "Sửa công", timesheet: "Bảng công", leave_ledger: "Sổ phép", attendance_photos: "Ảnh chấm công" };
const verbs: Record<string, string> = { created: "Tạo mới", updated: "Cập nhật", approved: "Duyệt", rejected: "Từ chối", cancelled: "Hủy", reviewed: "Đối soát", password_changed: "Đổi mật khẩu", password_reset: "Đặt lại mật khẩu", period_created: "Mở kỳ", snapshot_rebuilt: "Tính lại", hr_reviewed: "Xác nhận đối soát", locked: "Khóa kỳ", unlocked: "Mở lại kỳ", exception_reviewed: "Xử lý ngoại lệ", review_invalidated: "Yêu cầu đối soát lại", monthly_accrual: "Cấp phép tháng", retention_deleted: "Xóa ảnh hết hạn", historical_used: "Ghi phép đã dùng", adjustment: "Điều chỉnh", opening_balance: "Ghi số dư đầu kỳ" };
function actionLabel(value: string) { return value.split(".").map(part => groups[part] ?? verbs[part] ?? part.replaceAll("_", " ")).join(" · "); }
const fields: Record<string, string> = { id: "Mã tham chiếu", employee_id: "Mã hồ sơ", auth_user_id: "Mã đăng nhập", role: "Vai trò", status: "Trạng thái", must_change_password: "Yêu cầu đổi mật khẩu", year: "Năm", month: "Tháng", version: "Lần tính", work_date: "Ngày công", reason: "Lý do", review_note: "Ghi chú xét duyệt", full_name: "Họ và tên", employee_code: "Mã nhân viên", department: "Phòng ban", work_email: "Email công việc", phone: "Điện thoại", total_days: "Số ngày", start_date: "Từ ngày", end_date: "Đến ngày", created_at: "Ngày tạo", updated_at: "Ngày cập nhật", regular_minutes: "Phút công thường", overtime_minutes: "Phút tăng ca", days_delta: "Thay đổi số ngày phép", reviewed_at: "Đối soát lúc", locked_at: "Khóa lúc", entry_type: "Loại ghi nhận" };
function readable(value: unknown, field = ""): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  if (field === "role" && typeof value === "string") return roleLabels[value as Role] ?? value;
  if (field === "status" && typeof value === "string") return labelStatus(value);
  if (field.endsWith("_at") && typeof value === "string") return formatDateTime(value);
  if (Array.isArray(value)) return value.map(item => readable(item)).join(", ") || "—";
  if (typeof value === "object") return Object.entries(value).map(([key, item]) => (fields[key] ?? key.replaceAll("_", " ")) + ": " + readable(item, key)).join("; ");
  return String(value);
}
function Changes({ row }: { row: Audit }) {
  const before = row.before_json && typeof row.before_json === "object" ? row.before_json as Record<string, unknown> : {};
  const after = row.after_json && typeof row.after_json === "object" ? row.after_json as Record<string, unknown> : {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
  return keys.length ? <TableWrap><table><thead><tr><th>Thông tin</th><th>Trước</th><th>Sau</th></tr></thead><tbody>{keys.map(key => <tr key={key}><td data-label="Thông tin">{fields[key] ?? key.replaceAll("_", " ")}</td><td data-label="Trước">{readable(before[key], key)}</td><td data-label="Sau">{readable(after[key], key)}</td></tr>)}</tbody></table></TableWrap> : <p className="subtle-note">Thao tác này không ghi nhận thay đổi từng trường.</p>;
}
export default function AdminAuditPage() {
  const { params, updateQuery } = useQueryState();
  const action = params.get("action") ?? "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const resource = useResource<Audit[]>("/api/v1/admin/audit?" + new URLSearchParams({ action, page: String(page), page_size: "25" }));
  const accounts = useResource<Account[]>("/api/v1/admin/accounts");
  const [selected, setSelected] = useState<Audit | null>(null);
  const pageCount = Math.max(1, Math.ceil((resource.page?.total ?? 0) / 25));
  function actorName(id: string | null) { if (!id) return "Tác vụ hệ thống"; const person = accounts.data?.find(item => item.id === id)?.employees; const employee = Array.isArray(person) ? person[0] : person; return employee ? employee.full_name + " · " + employee.employee_code : "Tài khoản đã ghi nhận"; }
  return <>
    <PageHeader title="Nhật ký hệ thống" description="Tra cứu người thực hiện, lý do và các thay đổi đã ghi nhận." action={<Button type="button" variant="secondary" onClick={resource.reload} disabled={resource.loading}>Làm mới</Button>} />
    {resource.error && <Notice kind="error">{resource.error}</Notice>}
    <Panel title="Hoạt động" description={(resource.page?.total ?? 0) + " sự kiện phù hợp"}>
      <div className="toolbar"><Field label="Nhóm thao tác"><select value={action} onChange={event => updateQuery({ action: event.target.value, page: null })}><option value="">Tất cả hoạt động</option>{Object.entries(groups).map(([key, label]) => <option key={key} value={key + "."}>{label}</option>)}</select></Field></div>
      {resource.loading ? <LoadingState /> : !resource.data?.length ? <EmptyState title="Chưa có hoạt động phù hợp" /> : <TableWrap><table><thead><tr><th>Thời gian</th><th>Thao tác</th><th>Đối tượng</th><th>Người thực hiện</th><th>Chi tiết</th></tr></thead><tbody>{resource.data.map(row => <tr key={row.id}><td data-label="Thời gian">{formatDateTime(row.created_at)}</td><td data-label="Thao tác"><strong>{actionLabel(row.action)}</strong></td><td data-label="Đối tượng">{entities[row.entity_type] ?? row.entity_type.replaceAll("_", " ")}</td><td data-label="Người thực hiện">{actorName(row.actor_user_id)}</td><td data-label="Chi tiết"><Button type="button" variant="secondary" onClick={() => setSelected(row)}>Xem thay đổi</Button></td></tr>)}</tbody></table></TableWrap>}
      <footer className="reference-pagination"><span>Trang {page} / {pageCount}</span><div><Button type="button" variant="secondary" disabled={resource.loading || page <= 1} onClick={() => updateQuery({ page: String(page - 1) })}>Trước</Button><Button type="button" variant="secondary" disabled={resource.loading || page >= pageCount} onClick={() => updateQuery({ page: String(page + 1) })}>Sau</Button></div></footer>
    </Panel>
    {selected && <Dialog title="Chi tiết hoạt động" onClose={() => setSelected(null)}><p><strong>{actionLabel(selected.action)}</strong></p><p>{formatDateTime(selected.created_at)} · {actorName(selected.actor_user_id)}</p>{selected.reason && <Notice>Lý do: {selected.reason}</Notice>}<Changes row={selected} /><details className="audit-reference"><summary>Mã tham chiếu để tra cứu</summary><p>Sự kiện: {selected.id}</p><p>Đối tượng: {selected.entity_id ?? "—"}</p><p>Tài khoản: {selected.actor_user_id ?? "Tác vụ hệ thống"}</p></details></Dialog>}
  </>;
}
