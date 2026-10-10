import { createRequestId, jsonApiResponse, jsonError } from "@/server/api/http";
import { getActor } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPagination } from "@/server/api/pagination";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được xem nhật ký hệ thống.", requestId);
  const url = new URL(request.url);
  const pagination = getPagination(url.searchParams, { defaultSize: 50, maxSize: 100 });
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("audit_logs").select("id,actor_user_id,action,entity_type,entity_id,before_json,after_json,reason,created_at", { count: "exact" }).order("created_at", { ascending: false });
  const action = url.searchParams.get("action")?.trim();
  if (action) query = query.ilike("action", "%" + action + "%");
  const { data, count, error } = await query.range(pagination.from, pagination.to);
  if (error) return jsonError(500, "AUDIT_READ_FAILED", "Không thể tải nhật ký hệ thống.", requestId);
  return jsonApiResponse({ data, page: { number: pagination.page, size: pagination.size, total: count ?? 0 }, request_id: requestId }, { headers: { "Cache-Control": "private, no-store" } });
}
