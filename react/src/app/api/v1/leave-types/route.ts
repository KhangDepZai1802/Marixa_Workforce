import { randomUUID } from "node:crypto";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.mustChangePassword) return jsonError(403, "PASSWORD_CHANGE_REQUIRED", "Vui lòng đổi mật khẩu trước khi tiếp tục.", requestId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("leave_types").select("id,code,name,deducts_annual_balance").eq("active", true).order("name");
  if (error) return jsonError(500, "LEAVE_TYPES_READ_FAILED", "Không thể tải loại nghỉ.", requestId);
  return Response.json({ data, request_id: requestId });
}
