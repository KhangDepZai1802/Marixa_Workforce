import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  kind: z.enum(["check_in", "check_out"]),
  device_occurred_at: z.string().datetime({ offset: true }).nullable().optional(),
  source: z.enum(["online", "offline"]).default("online"),
  idempotency_key: z.string().uuid(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  accuracy_m: z.number().positive().max(10000).nullable().optional(),
  photo_expected: z.boolean().default(false),
}).strict().refine((value) => {
  const locationFields = [value.latitude, value.longitude, value.accuracy_m];
  return locationFields.every((field) => field == null) || locationFields.every((field) => field != null);
}, { path: ["location"], message: "Gửi đủ latitude, longitude, accuracy_m hoặc bỏ trống cả ba." });

export async function GET(request: Request) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!actor.employeeId) return jsonError(403, "EMPLOYEE_PROFILE_REQUIRED", "Tài khoản chưa có hồ sơ nhân viên.", requestId);
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)))
    return jsonError(422, "INVALID_DATE_FILTER", "Ngày lọc phải theo định dạng YYYY-MM-DD.", requestId);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const pageSize = Math.min(31, Math.max(1, Number(url.searchParams.get("page_size") ?? 31) || 31));
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("attendance_events").select("id,work_date,kind,occurred_at,device_occurred_at,received_at,source,location_flag,evidence_status,review_status,review_note", { count: "exact" }).eq("employee_id", actor.employeeId).order("work_date", { ascending: false }).order("kind");
  if (from) query = query.gte("work_date", from);
  if (to) query = query.lte("work_date", to);
  const { data, count, error } = await query.range((page - 1) * pageSize, page * pageSize - 1);
  if (error) return jsonError(500, "ATTENDANCE_READ_FAILED", "Không thể tải lịch sử chấm công.", requestId);
  return Response.json({ data, page: { number: page, size: pageSize, total: count ?? 0 }, request_id: requestId });
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.mustChangePassword) return jsonError(403, "PASSWORD_CHANGE_REQUIRED", "Vui lòng đổi mật khẩu trước khi tiếp tục.", requestId);
  if (!actor.employeeId) return jsonError(403, "EMPLOYEE_PROFILE_REQUIRED", "Tài khoản chưa được gắn hồ sơ nhân viên.", requestId);
  let input: unknown;
  try { input = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = bodySchema.safeParse(input);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Vui lòng kiểm tra thông tin chấm công.", requestId, Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0] ?? "body"), issue.message])));

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase.from("attendance_events").select("*").eq("idempotency_key", parsed.data.idempotency_key).maybeSingle();
  if (existing) {
    if (existing.employee_id !== actor.employeeId) return jsonError(409, "IDEMPOTENCY_KEY_CONFLICT", "Khóa đồng bộ đã được dùng.", requestId);
    return Response.json({ data: existing, replayed: true, request_id: requestId });
  }
  const { data, error } = await supabase.rpc("create_attendance_event", {
    p_kind: parsed.data.kind, p_source: parsed.data.source, p_device_occurred_at: parsed.data.device_occurred_at ?? null,
    p_idempotency_key: parsed.data.idempotency_key, p_latitude: parsed.data.latitude ?? null,
    p_longitude: parsed.data.longitude ?? null, p_accuracy_m: parsed.data.accuracy_m ?? null,
    p_photo_expected: parsed.data.photo_expected,
  });
  if (error?.code === "23505") return jsonError(409, "ATTENDANCE_ALREADY_EXISTS", "Đã có lượt chấm cùng loại trong ngày. Hãy gửi yêu cầu sửa công nếu cần.", requestId);
  if (error || !data) return jsonError(500, "ATTENDANCE_CREATE_FAILED", "Không thể ghi nhận lượt chấm. Vui lòng thử lại.", requestId);
  return Response.json({ data, replayed: false, request_id: requestId }, { status: 201 });
}
