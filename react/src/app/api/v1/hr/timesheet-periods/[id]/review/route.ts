import { randomUUID } from "node:crypto";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
type RouteContext = { params: Promise<{ id: string }> };
export async function POST(_request: Request, context: RouteContext) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền đối soát kỳ công.", requestId);
  const { id } = await context.params; const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("review_timesheet_period", { p_period_id: id });
  if (error) {
    if (error.code === "42501") return jsonError(403, "FORBIDDEN", "Bạn không có quyền đối soát kỳ công.", requestId);
    if (error.code === "23514") return jsonError(409, "UNREVIEWED_EXCEPTIONS", "Cần ghi chú xử lý cho mọi ngoại lệ trước khi đối soát.", requestId);
    if (error.code === "40001") return jsonError(409, "TIMESHEET_NOT_OPEN", "Kỳ công không còn ở trạng thái mở.", requestId);
    return jsonError(500, "TIMESHEET_REVIEW_FAILED", "Không thể xác nhận đối soát kỳ công.", requestId);
  }
  return Response.json({ data, request_id: requestId });
}
