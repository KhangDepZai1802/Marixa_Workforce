import { randomUUID } from "node:crypto";
import { z } from "zod";
import { jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.string().trim().email().max(254), password: z.string().min(1).max(128) }).strict();

export async function POST(request: Request) {
  const requestId = randomUUID();
  let input: unknown;
  try { input = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Thông tin đăng nhập không hợp lệ.", requestId); }
  const parsed = schema.safeParse(input);
  if (!parsed.success) return jsonError(422, "INVALID_LOGIN", "Vui lòng nhập email và mật khẩu.", requestId);

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error || !data.user) return jsonError(401, "LOGIN_FAILED", "Email hoặc mật khẩu chưa chính xác.", requestId);

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
