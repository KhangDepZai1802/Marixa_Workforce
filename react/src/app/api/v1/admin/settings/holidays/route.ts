import { createRequestId, jsonApiResponse, jsonError } from "@/server/api/http";
import { z } from "zod";
import { getActor } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ holiday_date: z.string().date(), name: z.string().trim().min(2).max(160), is_working_override: z.boolean() }).strict();
export async function POST(request: Request) {
  const requestId = createRequestId(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được cập nhật lịch ngày nghỉ.", requestId);
  let raw: unknown; try { raw = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(raw); if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Ngày nghỉ không hợp lệ.", requestId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("holidays").insert(parsed.data).select("id,holiday_date,name,is_working_override").single();
  if (error?.code === "23505") return jsonError(409, "HOLIDAY_EXISTS", "Đã có cấu hình cho ngày này.", requestId);
  if (error || !data) return jsonError(500, "HOLIDAY_CREATE_FAILED", "Không thể lưu lịch ngày nghỉ.", requestId);
  return jsonApiResponse({ data, request_id: requestId }, { status: 201 });
}
