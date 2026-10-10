import { createRequestId, jsonApiResponse, jsonError } from "@/server/api/http";
import { getActor } from "@/lib/auth";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const requestId = createRequestId();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được xem vận hành.", requestId);
  const service = createSupabaseServiceClient();
  const [metrics, runs] = await Promise.all([
    service.rpc("operations_metrics"),
    service.from("maintenance_runs").select("id,started_at,finished_at,status,deleted_count,accrued_count,error_code").order("started_at", { ascending: false }).limit(10),
  ]);
  if (metrics.error || runs.error) return jsonError(503, "OPERATIONS_READ_FAILED", "Không đọc được trạng thái vận hành.", requestId);
  return jsonApiResponse({ data: { ...metrics.data, runs: runs.data,
    limits: { database_bytes: 500 * 1024 * 1024, storage_bytes: 1024 * 1024 * 1024 },
    measured_at: new Date().toISOString() }, request_id: requestId });
}
