import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
type RouteContext = { params: Promise<{ id: string }> };
const schema = z.object({ day_id: z.string().uuid(), issue_code: z.string().trim().min(3).max(80), note: z.string().trim().min(3).max(2000) }).strict();
export async function POST(request: Request, context: RouteContext) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền ghi nhận xử lý ngoại lệ.", requestId);
  let body: unknown; try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Cần chọn ngoại lệ và ghi chú xử lý.", requestId);
  const { id } = await context.params; const supabase = await createSupabaseServerClient();
  const { data: day } = await supabase.from("timesheet_days").select("id,period_id").eq("id", parsed.data.day_id).eq("period_id", id).maybeSingle();
  if (!day) return jsonError(404, "TIMESHEET_DAY_NOT_FOUND", "Không tìm thấy dòng công trong kỳ.", requestId);
  const { data, error } = await supabase.rpc("acknowledge_timesheet_exception", { p_day_id: day.id, p_issue_code: parsed.data.issue_code, p_note: parsed.data.note });
  if (error) {
    if (error.code === "22023") return jsonError(422, "INVALID_EXCEPTION", "Ngoại lệ không có trong snapshot hiện tại.", requestId);
    if (error.code === "40001") return jsonError(409, "TIMESHEET_NOT_OPEN", "Chỉ có thể xử lý ngoại lệ ở kỳ đang mở.", requestId);
    return jsonError(500, "EXCEPTION_REVIEW_FAILED", "Không thể lưu ghi chú xử lý.", requestId);
  }
  return Response.json({ data, request_id: requestId });
}
