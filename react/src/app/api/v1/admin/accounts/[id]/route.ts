import { createRequestId, jsonApiResponse, jsonError } from "@/server/api/http";
import { z } from "zod";
import { getActor } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: RouteContext) {
  const requestId = createRequestId();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ quản trị viên được sửa tài khoản.", requestId);
  const bodySchema = z.object({ role: z.enum(["employee", "hr", "admin"]).optional(), status: z.enum(["active", "disabled"]).optional() }).strict().refine(v => Object.keys(v).length > 0);
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Thông tin tài khoản không hợp lệ.", requestId);
  const { id } = await context.params;
  const service = createSupabaseServiceClient();
  const { data: reviewer } = await service.from("app_users").select("id").eq("auth_user_id", actor.userId).single();
  const { data: before } = await service.from("app_users").select("id,employee_id,role,status,must_change_password").eq("id", id).maybeSingle();
  if (!reviewer || !before) return jsonError(404, "ACCOUNT_NOT_FOUND", "Không tìm thấy tài khoản.", requestId);
  if (before.id === reviewer.id && parsed.data.status === "disabled") return jsonError(409, "LAST_ADMIN_PROTECTED", "Không thể tự khóa tài khoản quản trị đang đăng nhập.", requestId);
  const { data: after, error } = await service.from("app_users").update(parsed.data).eq("id", id).select("id,employee_id,role,status,must_change_password").single();
  if (error || !after) {
    if (error?.code === "23505") return jsonError(409, "ACTIVE_ADMIN_EXISTS", "Đã có một quản trị viên đang hoạt động.", requestId);
    if (error?.code === "23514") return jsonError(409, "LAST_ADMIN_PROTECTED", "Không thể khóa hoặc đổi vai trò của quản trị viên đang hoạt động cuối cùng.", requestId);
    return jsonError(500, "ACCOUNT_UPDATE_FAILED", "Không thể cập nhật tài khoản.", requestId);
  }
  await service.from("audit_logs").insert({ actor_user_id: reviewer.id, action: "account.updated", entity_type: "app_user", entity_id: id, before_json: before, after_json: after, reason: "Admin cập nhật tài khoản", request_id: requestId });
  return jsonApiResponse({ data: after, request_id: requestId });
}

