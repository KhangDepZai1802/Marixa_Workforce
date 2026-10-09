import { randomUUID } from "node:crypto";
import { getActor, jsonError } from "@/lib/auth";

export async function GET() {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.mustChangePassword) return jsonError(403, "PASSWORD_CHANGE_REQUIRED", "Vui lòng đổi mật khẩu trước khi tiếp tục.", requestId);
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  const { data: account } = await supabase.from("app_users").select("employee_id, role, status, must_change_password").eq("auth_user_id", actor.userId).single();
  const employee = account?.employee_id ? await supabase.from("employees").select("id, employee_code, full_name, work_email, phone, department, job_title, status").eq("id", account.employee_id).maybeSingle() : null;
  return Response.json({ data: { account, employee: employee?.data ?? null }, request_id: requestId });
}
