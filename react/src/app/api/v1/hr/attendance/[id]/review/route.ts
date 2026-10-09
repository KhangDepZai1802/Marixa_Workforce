import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };
const schema = z.object({ result: z.enum(["reviewed", "rejected"]), note: z.string().trim().max(2000).nullable().optional() }).strict();

export async function POST(request: Request, context: RouteContext) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!["hr", "admin"].includes(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền đối soát lượt chấm.", requestId);
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Kết quả đối soát không hợp lệ.", requestId);
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("review_attendance_event", { p_event_id: id, p_result: parsed.data.result, p_note: parsed.data.note ?? null });
  if (error) {
    if (error.code === "42501") return jsonError(403, "FORBIDDEN", "Bạn không có quyền đối soát lượt chấm này.", requestId);
    if (error.code === "P0002") return jsonError(404, "EVENT_NOT_FOUND", "Không tìm thấy lượt chấm.", requestId);
    return jsonError(409, "ATTENDANCE_REVIEW_FAILED", "Không thể lưu kết quả đối soát. Tải lại dữ liệu rồi thử lại.", requestId);
  }
  return Response.json({ data, request_id: requestId });
}
