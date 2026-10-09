import { randomUUID } from "node:crypto";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function GET() {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được xem cấu hình hệ thống.", requestId);
  const supabase = await createSupabaseServerClient();
  const [offices, policies, holidays, leaveTypes] = await Promise.all([
    supabase.from("office_locations").select("id,name,latitude,longitude,radius_m,active,created_at").order("created_at"),
    supabase.from("work_policies").select("id,effective_from,effective_to,timezone,start_time,lunch_start,lunch_end,end_time,working_weekdays,late_grace_minutes,photo_retention_days").order("effective_from", { ascending: false }).limit(20),
    supabase.from("holidays").select("id,holiday_date,name,is_working_override").order("holiday_date", { ascending: false }).limit(100),
    supabase.from("leave_types").select("id,code,name,deducts_annual_balance,active").order("name"),
  ]);
  if (offices.error || policies.error || holidays.error || leaveTypes.error) return jsonError(500, "SETTINGS_READ_FAILED", "Không thể tải cấu hình.", requestId);
  return Response.json({ data: { office_locations: offices.data, work_policies: policies.data, holidays: holidays.data, leave_types: leaveTypes.data }, request_id: requestId });
}
