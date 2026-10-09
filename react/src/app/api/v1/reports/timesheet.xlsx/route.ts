import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền xuất bảng công.", requestId);
  const periodId = new URL(request.url).searchParams.get("period_id");
  if (!periodId) return jsonError(422, "PERIOD_REQUIRED", "Cần chọn kỳ công để xuất.", requestId);
  const supabase = await createSupabaseServerClient();
  const { data: period } = await supabase.from("timesheet_periods").select("id,year,month,status,version").eq("id", periodId).maybeSingle();
  if (!period) return jsonError(404, "TIMESHEET_NOT_FOUND", "Không tìm thấy kỳ công.", requestId);
  const { data: days, error } = await supabase.from("timesheet_days").select("employee_id,employee_code_snapshot,full_name_snapshot,department_snapshot,work_date,regular_minutes,overtime_minutes,previous_period_regular_adjustment,previous_period_overtime_adjustment,previous_period_source_period_id,leave_days,late_minutes,early_minutes,exceptions").eq("period_id", period.id).eq("snapshot_version", period.version).order("work_date").order("employee_id");
  if (error) return jsonError(500, "TIMESHEET_EXPORT_FAILED", "Không thể đọc snapshot bảng công.", requestId);
  if (!days?.length) return jsonError(409, "TIMESHEET_SNAPSHOT_MISSING", "Hãy tính lại bảng công trước khi xuất.", requestId);
  const sourcePeriodIds = [...new Set(days.map(day => day.previous_period_source_period_id).filter((id): id is string => Boolean(id)))];
  const { data: sourcePeriods, error: sourcePeriodError } = sourcePeriodIds.length
    ? await supabase.from("timesheet_periods").select("id,year,month").in("id", sourcePeriodIds)
    : { data: [], error: null };
  if (sourcePeriodError) return jsonError(500, "TIMESHEET_SOURCE_PERIOD_READ_FAILED", "Không thể đọc kỳ nguồn của khoản điều chỉnh.", requestId);
  const sourcePeriodLabels = new Map((sourcePeriods ?? []).map(source => [source.id, `${String(source.month).padStart(2,"0")}/${source.year}`]));
  const workbook = new ExcelJS.Workbook(); workbook.creator = "Marixa Workforce"; workbook.created = new Date();
  const sheet = workbook.addWorksheet("Bảng công", { views: [{ state: "frozen", ySplit: 4 }] });
  sheet.mergeCells("A1:N1"); sheet.getCell("A1").value = `BẢNG CÔNG THÁNG ${String(period.month).padStart(2,"0")}/${period.year}${period.status === "locked" ? "" : " — BẢN TẠM"}`;
  sheet.getCell("A1").font = { bold: true, size: 16, color: { argb: "FF1647C8" } };
  sheet.mergeCells("A2:N2"); sheet.getCell("A2").value = `Phiên bản ${period.version} · ${period.status === "locked" ? "Đã khóa" : "Chưa khóa"} · Xuất lúc ${new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date())}`;
  sheet.addRow([]);
  sheet.addRow(["Mã NV", "Họ tên", "Phòng ban", "Ngày", "Công thường (phút)", "Tăng ca (phút)", "Điều chỉnh công kỳ trước (phút)", "Điều chỉnh tăng ca kỳ trước (phút)", "Kỳ nguồn", "Phép (ngày)", "Đi trễ (phút)", "Về sớm (phút)", "Ngoại lệ", "Kỳ công"]);
  const header = sheet.getRow(4); header.font = { bold: true, color: { argb: "FFFFFFFF" } }; header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1647C8" } };
  for (const day of days) {
    sheet.addRow([day.employee_code_snapshot ?? "", day.full_name_snapshot ?? "", day.department_snapshot ?? "", day.work_date,
      day.regular_minutes, day.overtime_minutes, day.previous_period_regular_adjustment ?? 0, day.previous_period_overtime_adjustment ?? 0,
      day.previous_period_source_period_id ? sourcePeriodLabels.get(day.previous_period_source_period_id) ?? "Không rõ" : "",
      Number(day.leave_days), day.late_minutes, day.early_minutes,
      Array.isArray(day.exceptions) ? day.exceptions.join(", ") : "", period.status === "locked" ? "Đã khóa" : "Bản tạm"]);
  }
  sheet.columns = [{width:14},{width:26},{width:20},{width:14},{width:20},{width:18},{width:28},{width:30},{width:14},{width:14},{width:16},{width:16},{width:42},{width:16}];
  sheet.autoFilter = { from: "A4", to: "N4" };
  const output = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(output), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="marixa-timesheet-${period.year}-${String(period.month).padStart(2,"0")}-v${period.version}.xlsx"`, "Cache-Control": "private, no-store", "X-Request-Id": requestId } });
}
