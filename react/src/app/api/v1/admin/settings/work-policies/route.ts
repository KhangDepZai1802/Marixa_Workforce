import { createRequestId, jsonApiResponse, jsonError } from "@/server/api/http";
import { z } from "zod";
import { getActor } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const schema = z.object({
  effective_from: z.string().date(), effective_to: z.null().optional(),
  start_time: hhmm, lunch_start: hhmm, lunch_end: hhmm, end_time: hhmm,
  working_weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  late_grace_minutes: z.number().int().min(0).max(240), photo_retention_days: z.literal(90),
}).strict();

export async function POST(request: Request) {
  const requestId = createRequestId(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được cấu hình chính sách công.", requestId);
  let raw: unknown; try { raw = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Giờ làm, ngày làm việc hoặc thời hạn lưu ảnh không hợp lệ.", requestId);
  const p = parsed.data;
  if (!(p.start_time < p.lunch_start && p.lunch_start < p.lunch_end && p.lunch_end < p.end_time)) return jsonError(422, "INVALID_WORKDAY_TIMES", "Giờ nghỉ trưa phải nằm trong giờ làm.", requestId);
  if (new Set(p.working_weekdays).size !== p.working_weekdays.length) return jsonError(422, "DUPLICATE_WEEKDAY", "Ngày làm việc không được lặp.", requestId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_work_policy_version", {
    p_effective_from: p.effective_from,
    p_start_time: p.start_time,
    p_lunch_start: p.lunch_start,
    p_lunch_end: p.lunch_end,
    p_end_time: p.end_time,
    p_working_weekdays: p.working_weekdays,
    p_late_grace_minutes: p.late_grace_minutes,
    p_photo_retention_days: p.photo_retention_days,
  });
  if (error?.code === "23505" || error?.code === "23P01") return jsonError(409, "POLICY_VERSION_EXISTS", "Ngày hiệu lực chồng lấn với phiên bản ca hiện có.", requestId);
  if (error?.code === "22023") return jsonError(422, "POLICY_RANGE_INVALID", "Ngày hiệu lực tạo khoảng trống hoặc chồng lấn với ca hiện có.", requestId);
  if (error || !data) return jsonError(500, "POLICY_CREATE_FAILED", "Không thể tạo phiên bản chính sách.", requestId);
  return jsonApiResponse({ data, request_id: requestId }, { status: 201 });
}
