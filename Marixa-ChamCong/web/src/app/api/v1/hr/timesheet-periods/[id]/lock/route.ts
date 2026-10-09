import { randomUUID } from "node:crypto";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
type RouteContext = { params: Promise<{ id: string }> };
export async function POST(_request: Request, context: RouteContext) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được khóa kỳ công.", requestId);
  const { id } = await context.params; const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("lock_timesheet_period", { p_period_id: id });
  if (error) {
    if (error.code === "42501") return jsonError(403, "FORBIDDEN", "Chỉ admin được khóa kỳ công.", requestId);
    if (error.code === "40001") return jsonError(409, "TIMESHEET_NOT_REVIEWED", "HR phải đối soát kỳ công trước.", requestId);
    return jsonError(500, "TIMESHEET_LOCK_FAILED", "Không thể khóa kỳ công.", requestId);
  }
  return Response.json({ data, request_id: requestId });
}
