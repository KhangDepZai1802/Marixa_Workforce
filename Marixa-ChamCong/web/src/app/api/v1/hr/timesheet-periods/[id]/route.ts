import { randomUUID } from "node:crypto";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: RouteContext) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền xem kỳ công.", requestId);
  const { id } = await context.params; const supabase = await createSupabaseServerClient();
  const { data: period, error } = await supabase.from("timesheet_periods").select("*").eq("id", id).maybeSingle();
  if (error || !period) return jsonError(404, "TIMESHEET_NOT_FOUND", "Không tìm thấy kỳ công.", requestId);
  const [{ data: days }, { data: reviews }] = await Promise.all([
    supabase.from("timesheet_days").select("*").eq("period_id", id).eq("snapshot_version", period.version).order("work_date").order("employee_id"),
    supabase.from("timesheet_exception_reviews").select("employee_id,work_date,issue_code,note,reviewed_at,reviewed_by").eq("period_id", id).eq("snapshot_version", period.version),
  ]);
  return Response.json({ data: { period, days: days ?? [], exception_reviews: reviews ?? [] }, request_id: requestId });
}
