import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
const schema = z.object({ name: z.string().trim().min(2).max(120), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), radius_m: z.number().int().min(10).max(50000) }).strict();
export async function POST(request: Request) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được cấu hình vị trí văn phòng.", requestId);
  let body: unknown; try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(body); if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Vị trí hoặc bán kính không hợp lệ.", requestId);
  const supabase = await createSupabaseServerClient();
  const { count: activeCount } = await supabase.from("office_locations").select("id", { count: "exact", head: true }).eq("active", true);
  if ((activeCount ?? 0) > 0) return jsonError(409, "ACTIVE_OFFICE_EXISTS", "V1 chỉ cấu hình một văn phòng đang hoạt động; hãy cập nhật vị trí hiện tại.", requestId);
  const { data, error } = await supabase.from("office_locations").insert({ ...parsed.data, active: true }).select("id,name,latitude,longitude,radius_m,active").single();
  if (error || !data) return jsonError(500, "OFFICE_LOCATION_CREATE_FAILED", "Không thể lưu vị trí văn phòng.", requestId);
  return Response.json({ data, request_id: requestId }, { status: 201 });
}
