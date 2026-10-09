import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const schema = z.object({
  effective_from: z.string().date(), effective_to: z.string().date().nullable().optional(),
  start_time: hhmm, lunch_start: hhmm, lunch_end: hhmm, end_time: hhmm,
  working_weekdays: z.array(z.number().int().min(1).max(7)).min(1).max(7),
  late_grace_minutes: z.number().int().min(0).max(240), photo_retention_days: z.number().int().min(1).max(3650),
}).strict();

export async function POST(request: Request) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được cấu hình chính sách công.", requestId);
  let raw: unknown; try { raw = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Giờ làm, ngày làm việc hoặc thời hạn lưu ảnh không hợp lệ.", requestId);
  const p = parsed.data;
  if (p.effective_to && p.effective_to < p.effective_from) return jsonError(422, "INVALID_EFFECTIVE_RANGE", "Ngày hết hiệu lực không hợp lệ.", requestId);
  if (!(p.start_time < p.lunch_start && p.lunch_start < p.lunch_end && p.lunch_end < p.end_time)) return jsonError(422, "INVALID_WORKDAY_TIMES", "Giờ nghỉ trưa phải nằm trong giờ làm.", requestId);
  if (new Set(p.working_weekdays).size !== p.working_weekdays.length) return jsonError(422, "DUPLICATE_WEEKDAY", "Ngày làm việc không được lặp.", requestId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("work_policies").insert({ ...p, timezone: "Asia/Ho_Chi_Minh" })
    .select("id,effective_from,effective_to,timezone,start_time,lunch_start,lunch_end,end_time,working_weekdays,late_grace_minutes,photo_retention_days").single();
  if (error?.code === "23505") return jsonError(409, "POLICY_VERSION_EXISTS", "Đã có phiên bản chính sách bắt đầu từ ngày này.", requestId);
  if (error || !data) return jsonError(500, "POLICY_CREATE_FAILED", "Không thể tạo phiên bản chính sách.", requestId);
  return Response.json({ data, request_id: requestId }, { status: 201 });
}
