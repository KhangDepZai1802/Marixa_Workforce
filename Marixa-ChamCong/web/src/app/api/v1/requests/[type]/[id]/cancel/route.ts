import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const schema = z.object({ reason: z.string().trim().min(3).max(2000) }).strict();
const rpcByType = { leave: "cancel_leave_request", overtime: "cancel_overtime_request", correction: "cancel_attendance_correction" } as const;
type RouteContext = { params: Promise<{ type: string; id: string }> };
export async function POST(request: Request, context: RouteContext) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  let body: unknown; try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(422, "REASON_REQUIRED", "Cần nêu lý do hủy.", requestId);
  const { type, id } = await context.params;
  if (!(type in rpcByType)) return jsonError(404, "REQUEST_TYPE_NOT_FOUND", "Loại yêu cầu không hợp lệ.", requestId);
  const supabase = await createSupabaseServerClient();
  const rpc = rpcByType[type as keyof typeof rpcByType];
  const { data, error } = await supabase.rpc(rpc, { p_request_id: id, p_reason: parsed.data.reason });
  if (error) {
    if (error.code === "42501") return jsonError(403, "FORBIDDEN", "Bạn không thể hủy yêu cầu này.", requestId);
    if (error.code === "40001") return jsonError(409, "REQUEST_NOT_CANCELLABLE", "Yêu cầu không còn có thể hủy.", requestId);
    return jsonError(500, "REQUEST_CANCEL_FAILED", "Không thể hủy yêu cầu.", requestId);
  }
  return Response.json({ data, request_id: requestId });
}
