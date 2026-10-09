import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const decisionSchema = z.object({
  adjustment_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  regular_minutes_delta: z.number().int().min(-1440).max(1440).default(0),
  overtime_minutes_delta: z.number().int().min(-1440).max(1440).default(0),
  review_note: z.string().trim().min(3).max(2000),
}).strict();

export async function GET(request: Request) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword)
    return jsonError(403, "FORBIDDEN", "Bạn không có quyền xem điều chỉnh bảng công.", requestId);

  const periodId = new URL(request.url).searchParams.get("period_id");
  if (periodId && !z.string().uuid().safeParse(periodId).success)
    return jsonError(422, "INVALID_PERIOD", "Mã kỳ công không hợp lệ.", requestId);
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("timesheet_adjustments")
    .select("id,employee_id,source_event_id,source_period_id,target_period_id,work_date,regular_minutes_delta,overtime_minutes_delta,status,reason,review_note,reviewed_by,reviewed_at,created_at")
    .order("created_at", { ascending: false }).limit(500);
  if (periodId) query = query.eq("target_period_id", periodId);
  const { data, error } = await query;
  if (error) return jsonError(500, "TIMESHEET_ADJUSTMENT_READ_FAILED", "Không thể tải điều chỉnh kỳ trước.", requestId);
  return Response.json({ data: data ?? [], request_id: requestId }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword)
    return jsonError(403, "FORBIDDEN", "Bạn không có quyền xác nhận điều chỉnh bảng công.", requestId);

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Vui lòng kiểm tra quyết định, số phút và ghi chú.", requestId);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("review_late_attendance_adjustment", {
    p_adjustment_id: parsed.data.adjustment_id,
    p_decision: parsed.data.decision,
    p_regular_minutes_delta: parsed.data.regular_minutes_delta,
    p_overtime_minutes_delta: parsed.data.overtime_minutes_delta,
    p_note: parsed.data.review_note,
  });
  if (error) {
    const status = error.code === "42501" ? 403 : error.code === "40001" ? 409 : 422;
    const code = error.code === "42501" ? "FORBIDDEN" : error.code === "40001" ? "ADJUSTMENT_NOT_PENDING" : "ADJUSTMENT_REVIEW_FAILED";
    return jsonError(status, code, "Không thể xác nhận điều chỉnh. Hãy tải lại danh sách và kiểm tra ghi chú.", requestId);
  }
  return Response.json({ data, request_id: requestId });
}
