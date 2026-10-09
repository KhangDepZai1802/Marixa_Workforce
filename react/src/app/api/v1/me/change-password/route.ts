import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ new_password: z.string().min(12).max(128) }).strict();
export async function POST(request: Request) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Mật khẩu mới cần có ít nhất 12 ký tự.", requestId);
  const supabase = await createSupabaseServerClient();
  const { error: passwordError } = await supabase.auth.updateUser({ password: parsed.data.new_password });
  if (passwordError) return jsonError(400, "PASSWORD_UPDATE_FAILED", "Không thể đổi mật khẩu. Hãy kiểm tra mật khẩu hiện tại.", requestId);
  const service = createSupabaseServiceClient();
  const { data: account } = await service.from("app_users").select("id").eq("auth_user_id", actor.userId).single();
  if (!account) return jsonError(500, "ACCOUNT_UPDATE_FAILED", "Không thể cập nhật trạng thái tài khoản.", requestId);
  const { error } = await service.from("app_users").update({ must_change_password: false }).eq("id", account.id);
  if (error) return jsonError(500, "ACCOUNT_UPDATE_FAILED", "Mật khẩu đã đổi nhưng trạng thái tài khoản chưa đồng bộ. Hãy liên hệ quản trị viên.", requestId);
  await service.from("audit_logs").insert({ actor_user_id: account.id, action: "account.password_changed", entity_type: "app_user", entity_id: account.id, request_id: requestId });
  return Response.json({ data: { must_change_password: false }, request_id: requestId });
}
