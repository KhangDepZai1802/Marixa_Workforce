import { randomUUID } from "node:crypto";
import { z } from "zod";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

const schema = z.object({ year: z.number().int().min(2000).max(2200), month: z.number().int().min(1).max(12) }).strict();
export async function GET() {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền xem kỳ công.", requestId);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("timesheet_periods").select("id,year,month,status,reviewed_at,locked_at,version").order("year", { ascending: false }).order("month", { ascending: false }).limit(24);
  if (error) return jsonError(500, "TIMESHEET_READ_FAILED", "Không thể tải kỳ công.", requestId);
  return Response.json({ data, request_id: requestId });
}
export async function POST(request: Request) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền tạo kỳ công.", requestId);
  let body: unknown; try { body = await request.json(); } catch { return jsonError(400, "INVALID_JSON", "Dữ liệu gửi lên không hợp lệ.", requestId); }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(422, "VALIDATION_ERROR", "Năm hoặc tháng không hợp lệ.", requestId);
  const service = createSupabaseServiceClient();
  const { data: existing } = await service.from("timesheet_periods").select("id,year,month,status,version").eq("year", parsed.data.year).eq("month", parsed.data.month).maybeSingle();
  if (existing) return Response.json({ data: existing, replayed: true, request_id: requestId });
  const { data, error } = await service.from("timesheet_periods").insert(parsed.data).select("id,year,month,status,version").single();
  if (error || !data) return jsonError(error?.code === "23505" ? 409 : 500, "TIMESHEET_CREATE_FAILED", "Không thể tạo kỳ công.", requestId);
  const { data: reviewer } = await service.from("app_users").select("id").eq("auth_user_id", actor.userId).single();
  if (reviewer) await service.from("audit_logs").insert({ actor_user_id: reviewer.id, action: "timesheet.period_created", entity_type: "timesheet_period", entity_id: data.id, after_json: data, request_id: requestId });
  return Response.json({ data, replayed: false, request_id: requestId }, { status: 201 });
}
