import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
type RouteContext = { params: Promise<{ id: string }> };
const schema = z.object({ name: z.string().trim().min(2).max(120).optional(), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(), radius_m: z.number().int().min(10).max(50000).optional(), active: z.boolean().optional() }).strict().refine(v => Object.keys(v).length > 0);
export async function PATCH(request: Request, context: RouteContext) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được cấu hình vị trí văn phòng.", requestId);
  let body: unknown; try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(body); if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Thông tin văn phòng không hợp lệ.", requestId);
  const { id } = await context.params; const supabase = await createSupabaseServerClient();
  if (parsed.data.active === false) {
    const { count } = await supabase.from("office_locations").select("id", { count: "exact", head: true }).eq("active", true);
    const { data: current } = await supabase.from("office_locations").select("active").eq("id", id).maybeSingle();
    if (current?.active && (count ?? 0) <= 1) return jsonError(409, "ACTIVE_OFFICE_REQUIRED", "Cần giữ ít nhất một văn phòng đang hoạt động.", requestId);
  }
  const { data, error } = await supabase.from("office_locations").update(parsed.data).eq("id", id).select("id,name,latitude,longitude,radius_m,active").maybeSingle();
  if (error || !data) return jsonError(error ? 500 : 404, error ? "OFFICE_LOCATION_UPDATE_FAILED" : "OFFICE_LOCATION_NOT_FOUND", "Không thể cập nhật văn phòng.", requestId);
  return Response.json({ data, request_id: requestId });
}
