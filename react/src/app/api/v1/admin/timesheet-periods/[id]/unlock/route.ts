import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
type RouteContext = { params: Promise<{ id: string }> };
const schema = z.object({ reason: z.string().trim().min(3).max(2000) }).strict();
export async function POST(request: Request, context: RouteContext) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được mở lại kỳ công.", requestId);
  let body: unknown; try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(422, "REASON_REQUIRED", "Cần nêu lý do mở lại kỳ công.", requestId);
  const { id } = await context.params; const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("unlock_timesheet_period", { p_period_id: id, p_reason: parsed.data.reason });
  if (error) {
    if (error.code === "42501") return jsonError(403, "FORBIDDEN", "Chỉ admin được mở lại kỳ công.", requestId);
    if (error.code === "40001") return jsonError(409, "TIMESHEET_NOT_LOCKED", "Kỳ công không ở trạng thái khóa.", requestId);
    return jsonError(500, "TIMESHEET_UNLOCK_FAILED", "Không thể mở lại kỳ công.", requestId);
  }
  return Response.json({ data, request_id: requestId });
}
