import { createRequestId, jsonApiResponse, jsonError } from "@/server/api/http";
import { z } from "zod";
import { getActor } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { getLateAdjustmentPreview } from "@/lib/domain/late-adjustment";

const decisionSchema = z.object({
  adjustment_id: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
  review_note: z.string().trim().min(3).max(2000),
}).strict();

export async function GET(request: Request) {
  const requestId = createRequestId();
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
    .order("created_at", { ascending: false }).limit(100);
  if (periodId) query = query.eq("target_period_id", periodId);
  const { data, error } = await query;
  if (error) return jsonError(500, "TIMESHEET_ADJUSTMENT_READ_FAILED", "Không thể tải điều chỉnh kỳ trước.", requestId);
  const enriched = await Promise.all((data ?? []).map(async item => {
    if (item.status !== "pending_review") return item;
    try { return { ...item, preview: await getLateAdjustmentPreview(item) }; }
    catch (cause) { return { ...item, preview_error: cause instanceof Error ? cause.message : "Không thể đối soát kỳ gốc." }; }
  }));
  return jsonApiResponse({ data: enriched, request_id: requestId }, { headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword)
    return jsonError(403, "FORBIDDEN", "Bạn không có quyền xác nhận điều chỉnh bảng công.", requestId);

  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Vui lòng kiểm tra quyết định, số phút và ghi chú.", requestId);

  const supabase = await createSupabaseServerClient();
  const { data: adjustment, error: adjustmentError } = await supabase.from("timesheet_adjustments")
    .select("id,employee_id,source_event_id,source_period_id,work_date,status").eq("id", parsed.data.adjustment_id).maybeSingle();
  if (adjustmentError || !adjustment) return jsonError(404, "ADJUSTMENT_NOT_FOUND", "Không tìm thấy đề xuất điều chỉnh.", requestId);
  if (adjustment.status !== "pending_review") return jsonError(409, "ADJUSTMENT_NOT_PENDING", "Đề xuất đã được xử lý.", requestId);
  let preview;
  try { preview = await getLateAdjustmentPreview(adjustment); }
  catch (cause) { return jsonError(409, "ADJUSTMENT_SOURCE_UNAVAILABLE", cause instanceof Error ? cause.message : "Không thể đối soát kỳ gốc.", requestId); }
  const { data, error } = await createSupabaseServiceClient().rpc("review_late_attendance_adjustment", {
    p_actor_auth_user_id: actor.userId,
    p_adjustment_id: parsed.data.adjustment_id,
    p_decision: parsed.data.decision,
    p_regular_minutes_delta: preview.suggested_regular_minutes_delta,
    p_overtime_minutes_delta: preview.suggested_overtime_minutes_delta,
    p_expected_regular_minutes: preview.calculated_regular_minutes,
    p_expected_overtime_minutes: preview.calculated_overtime_minutes,
    p_note: parsed.data.review_note,
  });
  if (error) {
    const status = error.code === "42501" ? 403 : error.code === "40001" ? 409 : 422;
    const code = error.code === "42501" ? "FORBIDDEN" : error.code === "40001" ? "ADJUSTMENT_NOT_PENDING" : "ADJUSTMENT_REVIEW_FAILED";
    return jsonError(status, code, "Không thể xác nhận điều chỉnh. Hãy tải lại danh sách và kiểm tra ghi chú.", requestId);
  }
  return jsonApiResponse({ data, request_id: requestId });
}
