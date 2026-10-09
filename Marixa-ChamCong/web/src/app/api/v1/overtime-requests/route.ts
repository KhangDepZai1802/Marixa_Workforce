import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ work_date: z.string().date(), start_at: z.string().datetime({ offset: true }), end_at: z.string().datetime({ offset: true }), reason: z.string().trim().min(3).max(2000) }).strict();
export async function POST(request: Request) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.mustChangePassword) return jsonError(403, "PASSWORD_CHANGE_REQUIRED", "Vui lòng đổi mật khẩu trước khi tiếp tục.", requestId);
  if (!actor.employeeId) return jsonError(403, "EMPLOYEE_PROFILE_REQUIRED", "Tài khoản chưa có hồ sơ nhân viên.", requestId);
  let raw: unknown;
  try { raw = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Vui lòng kiểm tra thông tin tăng ca.", requestId);
  if (new Date(parsed.data.end_at) <= new Date(parsed.data.start_at)) return jsonError(422, "INVALID_TIME_RANGE", "Giờ kết thúc phải sau giờ bắt đầu.", requestId);
  const localDate = (d: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));
  if (localDate(parsed.data.start_at) !== parsed.data.work_date || localDate(parsed.data.end_at) !== parsed.data.work_date)
    return jsonError(422, "OVERTIME_DATE_MISMATCH", "Giờ tăng ca phải nằm trong ngày đã chọn.", requestId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_overtime_request", { p_date: parsed.data.work_date, p_start: parsed.data.start_at, p_end: parsed.data.end_at, p_reason: parsed.data.reason });
  if (error) return jsonError(error.code === "42501" ? 403 : 422, error.code === "42501" ? "FORBIDDEN" : "OVERTIME_REQUEST_INVALID", "Không thể gửi yêu cầu tăng ca.", requestId);
  if (!data) return jsonError(500, "OVERTIME_REQUEST_CREATE_FAILED", "Không thể gửi yêu cầu tăng ca.", requestId);
  return Response.json({ data, request_id: requestId }, { status: 201 });
}
