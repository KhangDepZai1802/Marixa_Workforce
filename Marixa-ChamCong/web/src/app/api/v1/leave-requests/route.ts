import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({
  leave_type_id: z.string().uuid(), start_date: z.string().date(), end_date: z.string().date(), reason: z.string().trim().min(3).max(2000),
  day_parts: z.array(z.object({ date: z.string().date(), part: z.enum(["full", "morning", "afternoon"]) }).strict()).min(1).max(31),
}).strict();

export async function POST(request: Request) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.mustChangePassword) return jsonError(403, "PASSWORD_CHANGE_REQUIRED", "Vui lòng đổi mật khẩu trước khi tiếp tục.", requestId);
  if (!actor.employeeId) return jsonError(403, "EMPLOYEE_PROFILE_REQUIRED", "Tài khoản chưa có hồ sơ nhân viên.", requestId);
  let raw: unknown;
  try { raw = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Vui lòng kiểm tra thông tin đơn nghỉ.", requestId, Object.fromEntries(parsed.error.issues.map(i => [String(i.path[0] ?? "body"), i.message])));
  if (parsed.data.end_date < parsed.data.start_date) return jsonError(422, "INVALID_DATE_RANGE", "Ngày kết thúc phải từ ngày bắt đầu trở đi.", requestId);
  const parts = parsed.data.day_parts;
  if (parts.some(p => p.date < parsed.data.start_date || p.date > parsed.data.end_date) || new Set(parts.map(p => p.date)).size !== parts.length)
    return jsonError(422, "INVALID_DAY_PARTS", "Mỗi ngày nghỉ trong khoảng chỉ được khai báo một lần.", requestId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_leave_request", { p_type_id: parsed.data.leave_type_id, p_start: parsed.data.start_date,
    p_end: parsed.data.end_date, p_parts: parts, p_reason: parsed.data.reason });
  if (error?.code === "23505") return jsonError(409, "LEAVE_DATE_CONFLICT", "Đã có đơn nghỉ đang chờ hoặc được duyệt trùng ngày.", requestId);
  if (error) return jsonError(error.code === "42501" ? 403 : 422, error.code === "42501" ? "FORBIDDEN" : "LEAVE_REQUEST_INVALID", "Không thể gửi đơn nghỉ. Hãy kiểm tra lịch làm và thông tin đơn.", requestId);
  if (!data) return jsonError(500, "LEAVE_REQUEST_CREATE_FAILED", "Không thể gửi đơn nghỉ. Vui lòng thử lại.", requestId);
  return Response.json({ data, request_id: requestId }, { status: 201 });
}
