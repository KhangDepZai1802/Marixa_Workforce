import { randomUUID } from "node:crypto";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền xem hàng đợi duyệt.", requestId);
  const supabase = await createSupabaseServerClient();
  const [leave, overtime, corrections] = await Promise.all([
    supabase.from("leave_requests").select("id,employee_id,leave_type_id,start_date,end_date,day_parts,total_days,reason,status,created_at,employees(employee_code,full_name),leave_types(name)").eq("status", "pending").order("created_at").limit(100),
    supabase.from("overtime_requests").select("id,employee_id,work_date,start_at,end_at,reason,status,created_at,employees(employee_code,full_name)").eq("status", "pending").order("created_at").limit(100),
    supabase.from("attendance_corrections").select("id,employee_id,work_date,proposed_check_in,proposed_check_out,reason,status,created_at,employees(employee_code,full_name)").eq("status", "pending").order("created_at").limit(100),
  ]);
  if (leave.error || overtime.error || corrections.error) return jsonError(500, "REQUESTS_READ_FAILED", "Không thể tải hàng đợi duyệt.", requestId);
  const ownEmployeeId = actor.employeeId;
  return Response.json({ data: {
    leave: (leave.data ?? []).map(item => ({ ...item, can_decide: item.employee_id !== ownEmployeeId && !(actor.role === "hr" && item.employee_id === ownEmployeeId) })),
    overtime: (overtime.data ?? []).map(item => ({ ...item, can_decide: item.employee_id !== ownEmployeeId })),
    corrections: (corrections.data ?? []).map(item => ({ ...item, can_decide: item.employee_id !== ownEmployeeId })),
  }, request_id: requestId });
}
