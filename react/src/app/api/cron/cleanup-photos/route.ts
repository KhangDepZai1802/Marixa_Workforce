import { createRequestId, jsonApiResponse, jsonError } from "@/server/api/http";
import { timingSafeEqual } from "node:crypto";
import { getActor } from "@/lib/auth";
import { businessDate } from "@/lib/format";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

async function cleanup(request: Request, manual: boolean) {
  const requestId = createRequestId();
  if (manual) {
    const actor = await getActor();
    if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
    if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được chạy dọn ảnh.", requestId);
  } else {
    const expected = Buffer.from(process.env.CRON_SECRET ?? "");
    const supplied = Buffer.from(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
    if (!expected.length || expected.length !== supplied.length || !timingSafeEqual(expected, supplied))
      return jsonError(401, "CRON_UNAUTHORIZED", "Không được phép chạy tác vụ.", requestId);
  }
  const service = createSupabaseServiceClient();
  const { error: logError } = await service.from("maintenance_runs").insert({
    id: requestId, job: "cleanup-photos", trigger_source: manual ? "admin" : "cron", status: "running",
  });
  if (logError) return jsonError(503, "JOB_LOG_FAILED", "Không thể ghi nhận tác vụ; hãy thử lại.", requestId);
  let deleted = 0;
  let accrued = 0;
  try {
    const result = await service.rpc("accrue_monthly_annual_leave", { p_as_of: businessDate() });
    if (result.error) throw new Error("LEAVE_ACCRUAL_FAILED");
    accrued = result.data ?? 0;
    const { data: photos, error } = await service.from("attendance_photos")
      .select("id,storage_path").is("deleted_at", null).lte("expires_at", new Date().toISOString())
      .order("expires_at").limit(500);
    if (error) throw new Error("RETENTION_QUERY_FAILED");
    if (photos?.length) {
      const removed = await service.storage.from("attendance-photos").remove(photos.map(p => p.storage_path));
      if (removed.error) throw new Error("RETENTION_STORAGE_FAILED");
      // Retry safely after a Storage success followed by a database interruption.
      const finalized = await service.rpc("finalize_photo_retention", { p_ids: photos.map(p => p.id) });
      if (finalized.error) throw new Error("RETENTION_METADATA_FAILED");
      deleted = finalized.data ?? 0;
    }
    const completed = await service.from("maintenance_runs").update({ status: "succeeded",
      finished_at: new Date().toISOString(), deleted_count: deleted, accrued_count: accrued }).eq("id", requestId);
    if (completed.error) throw new Error("JOB_LOG_FAILED");
    console.info(JSON.stringify({ job: "cleanup-photos", request_id: requestId, status: "succeeded", deleted, accrued }));
    return jsonApiResponse({ data: { deleted, annual_leave_days_granted: accrued, batch_limit: 500 }, request_id: requestId },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (cause) {
    const known = new Set(["LEAVE_ACCRUAL_FAILED", "RETENTION_QUERY_FAILED", "RETENTION_STORAGE_FAILED", "RETENTION_METADATA_FAILED", "JOB_LOG_FAILED"]);
    const code = cause instanceof Error && known.has(cause.message) ? cause.message : "MAINTENANCE_FAILED";
    await service.from("maintenance_runs").update({ status: "failed", error_code: code,
      finished_at: new Date().toISOString(), deleted_count: deleted, accrued_count: accrued }).eq("id", requestId);
    console.error(JSON.stringify({ job: "cleanup-photos", request_id: requestId, status: "failed", code }));
    return jsonError(503, code, "Tác vụ chưa hoàn tất. Admin có thể chạy lại; dữ liệu công vẫn được giữ.", requestId);
  }
}
export async function GET(request: Request) { return cleanup(request, false); }
export async function POST(request: Request) { return cleanup(request, true); }
