import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const schema = z.object({ employee_id: z.string().uuid().optional(), year: z.number().int().min(2000).max(2200).optional(), amount_days: z.number().min(-365).max(365), entry_type: z.enum(["grant", "carryover", "adjustment"]), reason: z.string().trim().min(3).max(2000) }).strict();
export async function GET(request: Request) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền xem sổ phép toàn công ty.", requestId);
  const url = new URL(request.url); const employeeId = url.searchParams.get("employee_id");
  const year = Number(url.searchParams.get("year") ?? new Date().getFullYear());
  if (!Number.isInteger(year) || year < 2000 || year > 2200) return jsonError(422, "INVALID_YEAR", "Năm không hợp lệ.", requestId);
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("leave_ledger").select("id,employee_id,year,amount_days,entry_type,leave_request_id,reason,created_at,employees(employee_code,full_name)").eq("year", year).order("created_at", { ascending: false }).limit(500);
  if (employeeId) query = query.eq("employee_id", employeeId);
  const { data, error } = await query;
  if (error) return jsonError(500, "LEAVE_LEDGER_READ_FAILED", "Không thể đọc sổ phép.", requestId);
  const totals = new Map<string, number>();
  for (const row of data ?? []) totals.set(row.employee_id, (totals.get(row.employee_id) ?? 0) + Number(row.amount_days));
  return Response.json({ data: data ?? [], balances: Object.fromEntries(totals), year, request_id: requestId });
}
export async function POST(request: Request) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền cấp hoặc điều chỉnh phép.", requestId);
  let body: unknown; try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(body);
  if (!parsed.success || !parsed.data.employee_id || !parsed.data.year) return jsonError(422, "VALIDATION_ERROR", "Cần chọn nhân viên, năm, số ngày và lý do.", requestId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("add_leave_balance_entry", { p_employee_id: parsed.data.employee_id, p_year: parsed.data.year, p_amount: parsed.data.amount_days, p_entry_type: parsed.data.entry_type, p_reason: parsed.data.reason });
  if (error) return jsonError(error.code === "42501" ? 403 : 422, error.code === "42501" ? "FORBIDDEN" : "LEAVE_LEDGER_ENTRY_FAILED", "Không thể ghi giao dịch phép. Hãy kiểm tra số ngày và lý do.", requestId);
  return Response.json({ data, request_id: requestId }, { status: 201 });
}
