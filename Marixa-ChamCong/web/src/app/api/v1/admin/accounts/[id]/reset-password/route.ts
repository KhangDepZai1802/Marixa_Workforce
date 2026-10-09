import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };
const schema = z.object({ temporary_password: z.string().min(12).max(128) }).strict();
export async function POST(request: Request, context: RouteContext) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ quản trị viên được đặt lại mật khẩu.", requestId);
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Mật khẩu tạm cần có ít nhất 12 ký tự.", requestId);
  const { id } = await context.params;
  const service = createSupabaseServiceClient();
  const [{ data: reviewer }, { data: account }] = await Promise.all([
    service.from("app_users").select("id").eq("auth_user_id", actor.userId).single(),
    service.from("app_users").select("id,auth_user_id,role").eq("id", id).maybeSingle(),
  ]);
  if (!reviewer || !account) return jsonError(404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.", requestId);
  const { error: authError } = await service.auth.admin.updateUserById(account.auth_user_id, { password: parsed.data.temporary_password });
  if (authError) return jsonError(400, "PASSWORD_RESET_FAILED", "Không thể đặt lại mật khẩu.", requestId);
  const { error } = await service.from("app_users").update({ must_change_password: true }).eq("id", id);
  if (error) return jsonError(500, "ACCOUNT_UPDATE_FAILED", "Mật khẩu đã đặt lại nhưng trạng thái tài khoản chưa đồng bộ.", requestId);
  await service.from("audit_logs").insert({ actor_user_id: reviewer.id, action: "account.password_reset", entity_type: "app_user", entity_id: id, request_id: requestId });
  return Response.json({ data: { id, must_change_password: true }, request_id: requestId });
}
