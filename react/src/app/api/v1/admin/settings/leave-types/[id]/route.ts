import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
type RouteContext = { params: Promise<{ id: string }> };
const schema = z.object({ name: z.string().trim().min(2).max(120).optional(), deducts_annual_balance: z.boolean().optional(), active: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0);
export async function PATCH(request: Request, context: RouteContext) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được cấu hình loại nghỉ.", requestId);
  let body: unknown; try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(body); if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Thông tin loại nghỉ không hợp lệ.", requestId);
  const { id } = await context.params; const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("leave_types").update(parsed.data).eq("id", id).select("id,code,name,deducts_annual_balance,active").maybeSingle();
  if (error || !data) return jsonError(error ? 500 : 404, error ? "LEAVE_TYPE_UPDATE_FAILED" : "LEAVE_TYPE_NOT_FOUND", "Không thể cập nhật loại nghỉ.", requestId);
  return Response.json({ data, request_id: requestId });
}
