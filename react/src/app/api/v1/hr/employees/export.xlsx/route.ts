import { createRequestId, jsonError } from "@/server/api/http";
import { getActor } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  STATUS_LABELS,
  buildEmployeeWorkbook,
  xlsxResponse,
  type EmployeeXlsxRow,
} from "@/lib/employee-xlsx";

export const runtime = "nodejs";

// Export theo đúng template 35 cột (cột A trống, trường ở B..AZ). Chỉ điền các
// trường có trong schema V1; các cột hợp đồng/lương/BHXH/ngân hàng giữ trống
// để 3 file (mau, danh-sach, export) dùng chung một khuôn.
export async function GET(_request: Request) {
  const requestId = createRequestId();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword)
    return jsonError(403, "FORBIDDEN", "Bạn không có quyền xuất danh sách nhân viên.", requestId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("employees")
    .select("employee_code,full_name,work_email,phone,department,job_title,hire_date,status")
    .order("employee_code");
  if (error) return jsonError(500, "EMPLOYEES_EXPORT_FAILED", "Không thể đọc danh sách nhân viên.", requestId);

  // Index trường (0-based) trong template: code=0, hoTenDem=1, ten=2,
  // dienThoai=8, email=9, phongBan=12, chucVu=13, ngayVaoLam=14, trangThai=17.
  // Cột Excel 1-based = fieldIndex + 1 (cột A..AI).
  const rows: EmployeeXlsxRow[] = (data ?? []).map((employee, index) => {
    const values = new Map<number, string | number>();
    const set = (fieldIndex: number, value: string | number) => values.set(fieldIndex + 1, value);
    set(0, employee.employee_code);
    set(1, employee.full_name);
    set(8, employee.phone ?? "");
    set(9, employee.work_email);
    set(12, employee.department ?? "");
    set(13, employee.job_title ?? "");
    set(14, employee.hire_date ?? "");
    set(17, STATUS_LABELS[employee.status] ?? "Đang hoạt động");
    return { values, rowNumber: index + 2 };
  });

  const workbook = buildEmployeeWorkbook(rows);
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return xlsxResponse(await workbook.xlsx.writeBuffer(), `marixa-nhan-vien-${stamp}.xlsx`, requestId);
}
