import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };
const schema = z.object({ employee_id: z.string().uuid(), role: z.enum(["employee", "hr", "admin"]), email: z.string().email(), temporary_password: z.string().min(12).max(128) }).strict();
export async function GET() {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được quản lý tài khoản.", requestId);
  const service = createSupabaseServiceClient();
  const { data, error } = await service.from("app_users").select("id,employee_id,role,status,must_change_password,created_at,employees(employee_code,full_name,work_email)").order("created_at", { ascending: false }).limit(100);
  if (error) return jsonError(500, "ACCOUNTS_READ_FAILED", "Không thể tải danh sách tài khoản.", requestId);
  return Response.json({ data, request_id: requestId });
}
export async function POST(request: Request) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ quản trị viên được cấp tài khoản.", requestId);
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Vui lòng kiểm tra email, vai trò và mật khẩu tạm (tối thiểu 12 ký tự).", requestId);
  const service = createSupabaseServiceClient();
  const { data: employee } = await service.from("employees").select("id,status,work_email").eq("id", parsed.data.employee_id).maybeSingle();
  if (!employee || employee.status !== "active" || employee.work_email.toLowerCase() !== parsed.data.email.toLowerCase())
    return jsonError(422, "EMPLOYEE_ACCOUNT_MISMATCH", "Email phải khớp hồ sơ nhân viên đang hoạt động.", requestId);
  const { data: reviewer } = await service.from("app_users").select("id").eq("auth_user_id", actor.userId).single();
  if (!reviewer) return jsonError(403, "FORBIDDEN", "Tài khoản quản trị chưa được khởi tạo đúng.", requestId);
  const { data: created, error: authError } = await service.auth.admin.createUser({ email: parsed.data.email, password: parsed.data.temporary_password, email_confirm: true });
  if (authError || !created.user) return jsonError(authError?.status === 422 ? 409 : 400, "AUTH_ACCOUNT_CREATE_FAILED", "Không thể tạo tài khoản Auth. Hãy kiểm tra email đã được dùng chưa.", requestId);
  const { data: account, error: accountError } = await service.from("app_users").insert({ auth_user_id: created.user.id, employee_id: employee.id, role: parsed.data.role, status: "active", must_change_password: true }).select("id,employee_id,role,status,must_change_password").single();
  if (accountError || !account) {
    await service.auth.admin.deleteUser(created.user.id);
    const duplicateAdmin = accountError?.code === "23505" && parsed.data.role === "admin";
    return jsonError(duplicateAdmin ? 409 : 409, duplicateAdmin ? "ACTIVE_ADMIN_EXISTS" : "ACCOUNT_CONFLICT", duplicateAdmin ? "Đã có một quản trị viên đang hoạt động." : "Hồ sơ đã có tài khoản hoặc dữ liệu bị trùng.", requestId);
  }
  await service.from("audit_logs").insert({ actor_user_id: reviewer.id, action: "account.created", entity_type: "app_user", entity_id: account.id, after_json: account, reason: "Admin cấp tài khoản", request_id: requestId });
  return Response.json({ data: account, request_id: requestId }, { status: 201 });
}


