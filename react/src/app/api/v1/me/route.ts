import { createRequestId, jsonApiResponse, jsonError } from "@/server/api/http";
import { getActor } from "@/lib/auth";

export async function GET() {
  const requestId = createRequestId();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.mustChangePassword) return jsonError(403, "PASSWORD_CHANGE_REQUIRED", "Vui lòng đổi mật khẩu trước khi tiếp tục.", requestId);
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = await createSupabaseServerClient();
  // getActor has already read and validated this account in the same request.
  const account = { employee_id: actor.employeeId, role: actor.role, status: "active", must_change_password: actor.mustChangePassword };
  const employee = actor.employeeId ? await supabase.from("employees").select("id, employee_code, full_name, work_email, phone, department, job_title, status").eq("id", actor.employeeId).maybeSingle() : null;
  if (employee?.error) return jsonError(500, "PROFILE_READ_FAILED", "Không thể tải hồ sơ nhân viên.", requestId);
  return jsonApiResponse({ data: { account, employee: employee?.data ?? null }, request_id: requestId });
}
