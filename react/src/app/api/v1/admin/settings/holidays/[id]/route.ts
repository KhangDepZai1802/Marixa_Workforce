import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
type RouteContext = { params: Promise<{ id: string }> };
const schema = z.object({ name: z.string().trim().min(2).max(160).optional(), is_working_override: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0);
export async function PATCH(request: Request, context: RouteContext) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được cập nhật lịch ngày nghỉ.", requestId);
  let body: unknown; try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(body); if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Thông tin ngày nghỉ không hợp lệ.", requestId);
  const { id } = await context.params; const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("holidays").update(parsed.data).eq("id", id).select("id,holiday_date,name,is_working_override").maybeSingle();
  if (error || !data) return jsonError(error ? 500 : 404, error ? "HOLIDAY_UPDATE_FAILED" : "HOLIDAY_NOT_FOUND", "Không thể cập nhật ngày nghỉ.", requestId);
  return Response.json({ data, request_id: requestId });
}
