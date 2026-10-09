import { randomUUID } from "node:crypto";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.role !== "admin" || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Chỉ admin được xem nhật ký hệ thống.", requestId);
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const size = Math.min(100, Math.max(1, Number(url.searchParams.get("page_size") ?? 50) || 50));
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("audit_logs").select("id,actor_user_id,action,entity_type,entity_id,before_json,after_json,reason,created_at", { count: "exact" }).order("created_at", { ascending: false });
  const action = url.searchParams.get("action")?.trim();
  if (action) query = query.ilike("action", "%" + action + "%");
  const { data, count, error } = await query.range((page - 1) * size, page * size - 1);
  if (error) return jsonError(500, "AUDIT_READ_FAILED", "Không thể tải nhật ký hệ thống.", requestId);
  return Response.json({ data, page: { number: page, size, total: count ?? 0 }, request_id: requestId }, { headers: { "Cache-Control": "private, no-store" } });
}
