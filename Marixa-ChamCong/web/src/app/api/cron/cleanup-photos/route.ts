import { randomUUID, timingSafeEqual } from "node:crypto";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

async function cleanup(request: Request, manual: boolean) {
  const requestId = randomUUID();
  if (manual) {
    const actor = await getActor();
    if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
    if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được chạy dọn ảnh.", requestId);
  } else {
    const expected = process.env.CRON_SECRET;
    const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!expected || !supplied || expected.length !== supplied.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied)))
      return jsonError(401, "CRON_UNAUTHORIZED", "Không được phép chạy tác vụ.", requestId);
  }
  const service = createSupabaseServiceClient();
  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const businessDate = `${dateParts.find(part => part.type === "year")?.value}-${dateParts.find(part => part.type === "month")?.value}-${dateParts.find(part => part.type === "day")?.value}`;
  const { data: accrued, error: accrualError } = await service.rpc("accrue_monthly_annual_leave", { p_as_of: businessDate });
  if (accrualError) return jsonError(500, "LEAVE_ACCRUAL_FAILED", "Không thể cấp phép năm định kỳ.", requestId);
  const { data: photos, error: readError } = await service.from("attendance_photos").select("id,attendance_event_id,storage_path").is("deleted_at", null).lte("expires_at", new Date().toISOString()).limit(500);
  if (readError) return jsonError(500, "RETENTION_QUERY_FAILED", "Không thể đọc ảnh hết hạn.", requestId);
  if (!photos?.length) return Response.json({ data: { deleted: 0, annual_leave_days_granted: accrued ?? 0 }, request_id: requestId });
  const { error: storageError } = await service.storage.from("attendance-photos").remove(photos.map(p => p.storage_path));
  if (storageError) return jsonError(503, "RETENTION_STORAGE_FAILED", "Không thể xóa một số ảnh; metadata vẫn được giữ để thử lại.", requestId);
  const ids = photos.map(p => p.id);
  const eventIds = photos.map(p => p.attendance_event_id);
  const { data: eventRows } = await service.from("attendance_events").select("id,work_date").in("id", eventIds);
  const { data: lockedPeriods } = await service.from("timesheet_periods").select("year,month").eq("status", "locked");
  const lockedKeys = new Set((lockedPeriods ?? []).map(p => `${p.year}-${String(p.month).padStart(2, "0")}`));
  const mutableEventIds = (eventRows ?? []).filter(e => !lockedKeys.has(e.work_date.slice(0, 7))).map(e => e.id);
  const [{ error: metadataError }, { error: eventError }] = await Promise.all([
    service.from("attendance_photos").update({ deleted_at: new Date().toISOString() }).in("id", ids),
    mutableEventIds.length ? service.from("attendance_events").update({ evidence_status: "expired", updated_at: new Date().toISOString() }).in("id", mutableEventIds) : Promise.resolve({ error: null }),
  ]);
  if (metadataError || eventError) return jsonError(500, "RETENTION_METADATA_FAILED", "Ảnh đã xóa khỏi Storage nhưng metadata cần được đối soát.", requestId);
  const { data: admin } = await service.from("app_users").select("id").eq("role", "admin").eq("status", "active").single();
  if (admin) await service.from("audit_logs").insert({ actor_user_id: admin.id, action: "attendance_photos.retention_deleted", entity_type: "attendance_photo_batch", after_json: { count: photos.length }, request_id: requestId });
  return Response.json({ data: { deleted: photos.length, annual_leave_days_granted: accrued ?? 0 }, request_id: requestId });
}

export async function GET(request: Request) { return cleanup(request, false); }
export async function POST(request: Request) { return cleanup(request, true); }
