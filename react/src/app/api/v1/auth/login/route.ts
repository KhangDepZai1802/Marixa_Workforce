import { randomUUID } from "node:crypto";
import { z } from "zod";
import { jsonError } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("0084")) digits = `0${digits.slice(4)}`;
  else if (digits.startsWith("84")) digits = `0${digits.slice(2)}`;
  return digits;
}

const schema = z.object({
  phone: z.string().trim().min(7).max(30).regex(/^\+?[\d\s().-]+$/).refine(value => normalizePhone(value).length >= 7),
  password: z.string().min(1).max(128),
}).strict();

export async function POST(request: Request) {
  const requestId = randomUUID();
  let input: unknown;
  try { input = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Thông tin đăng nhập không hợp lệ.", requestId); }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return jsonError(422, "INVALID_LOGIN", "Vui lòng nhập số điện thoại hợp lệ và mật khẩu.", requestId);

  try {
    const service = createSupabaseServiceClient();
    const { data: employees, error: employeeError } = await service.from("employees")
      .select("phone,work_email").eq("status", "active").not("phone", "is", null);
    if (employeeError) return jsonError(503, "AUTH_UNAVAILABLE", "Chưa kết nối được Supabase. Hãy thử lại sau.", requestId);

    const normalizedPhone = normalizePhone(parsed.data.phone);
    const matches = (employees ?? []).filter(employee => normalizePhone(employee.phone ?? "") === normalizedPhone);
    if (matches.length !== 1 || !matches[0]) return jsonError(401, "LOGIN_FAILED", "Số điện thoại hoặc mật khẩu chưa chính xác.", requestId);
    const employee = matches[0];

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: employee.work_email, password: parsed.data.password });
    if (error || !data.user) return jsonError(401, "LOGIN_FAILED", "Số điện thoại hoặc mật khẩu chưa chính xác.", requestId);

    const { data: account, error: accountError } = await supabase.from("app_users")
      .select("role,status,must_change_password").eq("auth_user_id", data.user.id).maybeSingle();
    if (accountError || !account || account.status !== "active" || !["employee", "hr", "admin"].includes(account.role)) {
      await supabase.auth.signOut();
      return jsonError(403, "ACCOUNT_UNAVAILABLE", "Tài khoản chưa được cấp quyền hoặc đã bị khóa. Hãy liên hệ quản trị viên.", requestId);
    }
    return Response.json({ data: { role: account.role, must_change_password: account.must_change_password }, request_id: requestId });
  } catch {
    return jsonError(503, "AUTH_UNAVAILABLE", "Chưa kết nối được Supabase. Hãy kiểm tra cấu hình môi trường và thử lại.", requestId);
  }
}
