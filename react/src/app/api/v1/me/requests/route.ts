import { randomUUID } from "node:crypto";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!actor.employeeId) return jsonError(403, "EMPLOYEE_PROFILE_REQUIRED", "Tài khoản chưa có hồ sơ nhân viên.", requestId);
  const supabase = await createSupabaseServerClient();
  const [leave, overtime, corrections, balance] = await Promise.all([
    supabase.from("leave_requests").select("id,start_date,end_date,day_parts,total_days,reason,status,review_note,created_at,leave_types(name)").eq("employee_id", actor.employeeId).order("created_at", { ascending: false }).limit(100),
    supabase.from("overtime_requests").select("id,work_date,start_at,end_at,reason,status,review_note,created_at").eq("employee_id", actor.employeeId).order("created_at", { ascending: false }).limit(100),
    supabase.from("attendance_corrections").select("id,work_date,proposed_check_in,proposed_check_out,reason,status,review_note,created_at").eq("employee_id", actor.employeeId).order("created_at", { ascending: false }).limit(100),
    supabase.from("leave_ledger").select("year,amount_days,entry_type,reason,created_at").eq("employee_id", actor.employeeId).order("created_at", { ascending: false }).limit(500),
  ]);
  if (leave.error || overtime.error || corrections.error || balance.error) return jsonError(500, "REQUESTS_READ_FAILED", "Không thể tải đơn và yêu cầu.", requestId);
  return Response.json({ data: { leave: leave.data, overtime: overtime.data, corrections: corrections.data, leave_ledger: balance.data }, request_id: requestId });
}
