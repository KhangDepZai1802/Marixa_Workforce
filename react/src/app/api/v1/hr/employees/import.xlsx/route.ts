import { createRequestId, jsonApiResponse, jsonError } from "@/server/api/http";
import ExcelJS from "exceljs";
import { getActor } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isBlankRow,
  readEmployeeRows,
  validateEmployeeRow,
  type EmployeeImportResult,
  type EmployeeImportResultRow,
} from "@/lib/employee-xlsx";

export const runtime = "nodejs";
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 1000;

export async function POST(request: Request) {
  const requestId = createRequestId();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword)
    return jsonError(403, "FORBIDDEN", "Bạn không có quyền import danh sách nhân viên.", requestId);

  let form: FormData;
  try { form = await request.formData(); } catch {
    return jsonError(400, "INVALID_MULTIPART", "Tệp không hợp lệ. Hãy tải file .xlsx lên lại.", requestId);
  }
  const file = form.get("file");
  if (!(file instanceof File)) return jsonError(422, "FILE_REQUIRED", "Cần tải file .xlsx lên.", requestId);
  const name = file.name.toLowerCase();
  const isXlsx = name.endsWith(".xlsx") || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (!isXlsx || file.size <= 0 || file.size > MAX_BYTES)
    return jsonError(422, "FILE_INVALID", "File phải là .xlsx và không vượt quá 5 MB.", requestId);

  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  try { await workbook.xlsx.load(buffer); } catch {
    return jsonError(422, "XLSX_PARSE_FAILED", "Không đọc được file. Hãy kiểm tra lại file .xlsx.", requestId);
  }
  const rows = readEmployeeRows(workbook);
  const dataRows = rows.filter(row => !isBlankRow(row));
  if (dataRows.length > MAX_ROWS) return jsonError(413, "TOO_MANY_ROWS", `File chứa quá nhiều hàng (tối đa ${MAX_ROWS}).`, requestId);

  const supabase = await createSupabaseServerClient();
  const { data: existing, error: readError } = await supabase.from("employees").select("id, employee_code, work_email, status");
  if (readError) return jsonError(500, "EMPLOYEES_READ_FAILED", "Không thể đọc danh sách hiện có.", requestId);
  const byCode = new Map((existing ?? []).map(e => [e.employee_code.toUpperCase(), e]));
  const emailOwners = new Map((existing ?? []).map(e => [e.work_email.toLowerCase(), e.employee_code]));

  const results: EmployeeImportResultRow[] = [];
  const seenCodes = new Set<string>();
  const seenEmails = new Set<string>();
  let created = 0; let updated = 0; let skipped = 0;

  for (const row of rows) {
    const codeCell = typeof row.values.get(1) === "string" ? (row.values.get(1) as string).trim().toUpperCase() : "";
    const hoCell = typeof row.values.get(2) === "string" ? (row.values.get(2) as string).trim() : "";
    const tenCell = typeof row.values.get(3) === "string" ? (row.values.get(3) as string).trim() : "";
    const base: EmployeeImportResultRow = {
      rowNumber: row.rowNumber,
      employeeCode: codeCell,
      fullName: [hoCell, tenCell].filter(Boolean).join(" "),
      status: "skipped",
      issues: [],
    };
    if (isBlankRow(row)) { results.push(base); skipped += 1; continue; }

    const validation = validateEmployeeRow(row, seenCodes);
    if (!validation.ok) {
      base.status = "error";
      base.issues = validation.issues;
      results.push(base);
      continue;
    }

    const { data } = validation;
    const codeKey = data.employee_code.toUpperCase();
    const inDb = byCode.get(codeKey);
    const ownerEmail = emailOwners.get(data.work_email);
    if (ownerEmail && ownerEmail !== inDb?.employee_code) {
      base.status = "error";
      base.issues.push(`Email “${data.work_email}” đã thuộc hồ sơ ${ownerEmail}`);
      results.push(base);
      continue;
    }
    if (seenEmails.has(data.work_email)) {
      base.status = "error";
      base.issues.push(`Email “${data.work_email}” trùng với một hàng khác trong file`);
      results.push(base);
      continue;
    }
    seenEmails.add(data.work_email);

    const target = {
      employee_code: data.employee_code,
      full_name: data.full_name,
      work_email: data.work_email,
      phone: data.phone,
      department: data.department,
      job_title: data.job_title,
      hire_date: data.hire_date,
      status: data.status,
    };
    if (inDb) {
      const { error: updateError } = await supabase.from("employees").update(target).eq("id", inDb.id);
      if (updateError?.code === "23505") {
        base.status = "error"; base.issues.push("Email hoặc mã đã xung đột với hồ sơ khác.");
      } else if (updateError) {
        base.status = "error"; base.issues.push("Không cập nhật được hồ sơ, hãy thử lại.");
      } else {
        base.status = "updated"; base.employeeId = inDb.id; updated += 1;
      }
    } else {
      const { data: inserted, error: insertError } = await supabase.from("employees").insert(target).select("id").single();
      if (insertError?.code === "23505") {
        base.status = "error"; base.issues.push("Email hoặc mã đã tồn tại trong hệ thống.");
      } else if (insertError) {
        base.status = "error"; base.issues.push("Không tạo được hồ sơ, hãy thử lại.");
      } else {
        base.status = "created"; base.employeeId = inserted.id; created += 1;
      }
    }
    results.push(base);
  }

  const errorsCount = results.filter(r => r.status === "error").length;
  const result: EmployeeImportResult = {
    total: dataRows.length,
    created,
    updated,
    skipped,
    errors: errorsCount,
    rows: results,
  };
  return jsonApiResponse({ data: result, request_id: requestId });
}
