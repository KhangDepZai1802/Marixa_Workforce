import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const inputSchema = z.object({ decision: z.enum(["approved", "rejected"]), note: z.string().max(2000).optional() }).strict();
const rpcByType = { leave: "decide_leave_request", overtime: "decide_overtime_request", correction: "decide_attendance_correction" } as const;

type RouteContext = { params: Promise<{ type: string; id: string }> };
export async function POST(request: Request, context: RouteContext) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.mustChangePassword) return jsonError(403, "PASSWORD_CHANGE_REQUIRED", "Vui lòng đổi mật khẩu trước khi tiếp tục.", requestId);
  if (actor.role === "employee") return jsonError(403, "FORBIDDEN", "Bạn không có quyền duyệt yêu cầu.", requestId);
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Quyết định không hợp lệ.", requestId);
  const { type, id } = await context.params;
  if (!(type in rpcByType)) return jsonError(404, "REQUEST_TYPE_NOT_FOUND", "Loại yêu cầu không hợp lệ.", requestId);
  const supabase = await createSupabaseServerClient();
  const rpc = rpcByType[type as keyof typeof rpcByType];
  const { data, error } = await supabase.rpc(rpc, { p_request_id: id, p_decision: parsed.data.decision, p_note: parsed.data.note ?? null });
  if (error) {
    if (error.code === "42501") return jsonError(403, "FORBIDDEN", "Bạn không thể duyệt yêu cầu này.", requestId);
    if (error.code === "40001") return jsonError(409, "REQUEST_ALREADY_DECIDED", "Yêu cầu đã được xử lý.", requestId);
    if (error.code === "P0002") return jsonError(404, "REQUEST_NOT_FOUND", "Không tìm thấy yêu cầu.", requestId);
    if (error.code === "23514") return jsonError(409, "INSUFFICIENT_LEAVE_BALANCE", "Số dư phép không đủ để duyệt đơn.", requestId);
    return jsonError(500, "DECISION_FAILED", "Không thể lưu quyết định.", requestId);
  }
  return Response.json({ data, request_id: requestId });
}
