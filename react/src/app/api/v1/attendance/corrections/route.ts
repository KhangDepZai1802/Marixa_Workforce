import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ work_date: z.string().date(), proposed_check_in: z.string().datetime({ offset: true }).nullable(), proposed_check_out: z.string().datetime({ offset: true }).nullable(), reason: z.string().trim().min(3).max(2000) }).strict();
export async function POST(request: Request) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.mustChangePassword) return jsonError(403, "PASSWORD_CHANGE_REQUIRED", "Vui lòng đổi mật khẩu trước khi tiếp tục.", requestId);
  if (!actor.employeeId) return jsonError(403, "EMPLOYEE_PROFILE_REQUIRED", "Tài khoản chưa có hồ sơ nhân viên.", requestId);
  let raw: unknown;
  try { raw = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Vui lòng kiểm tra thông tin yêu cầu sửa công.", requestId);
  if (!parsed.data.proposed_check_in && !parsed.data.proposed_check_out) return jsonError(422, "CORRECTION_TIME_REQUIRED", "Cần đề xuất ít nhất một mốc giờ.", requestId);
  if (parsed.data.proposed_check_in && parsed.data.proposed_check_out && new Date(parsed.data.proposed_check_out) <= new Date(parsed.data.proposed_check_in))
    return jsonError(422, "INVALID_TIME_RANGE", "Giờ ra phải sau giờ vào.", requestId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("submit_attendance_correction", { p_date: parsed.data.work_date, p_check_in: parsed.data.proposed_check_in, p_check_out: parsed.data.proposed_check_out, p_reason: parsed.data.reason });
  if (error?.code === "23505") return jsonError(409, "CORRECTION_ALREADY_PENDING", "Đã có yêu cầu sửa công đang chờ cho ngày này.", requestId);
  if (error) return jsonError(error.code === "42501" ? 403 : 422, error.code === "42501" ? "FORBIDDEN" : "CORRECTION_INVALID", "Không thể gửi yêu cầu sửa công.", requestId);
  if (!data) return jsonError(500, "CORRECTION_CREATE_FAILED", "Không thể gửi yêu cầu sửa công.", requestId);
  return Response.json({ data, request_id: requestId }, { status: 201 });
}
