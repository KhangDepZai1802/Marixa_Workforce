import { randomUUID } from "node:crypto";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!actor.employeeId) return jsonError(403, "EMPLOYEE_PROFILE_REQUIRED", "Tài khoản chưa có hồ sơ nhân viên.", requestId);
  const url = new URL(request.url); const from = url.searchParams.get("from"); const to = url.searchParams.get("to");
  if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) return jsonError(422, "INVALID_DATE_FILTER", "Ngày lọc cần theo định dạng YYYY-MM-DD.", requestId);
  const page = Math.max(1, Math.min(10000, Number(url.searchParams.get("page") ?? 1) || 1));
  const size = Math.min(62, Math.max(1, Number(url.searchParams.get("page_size") ?? 62) || 62));
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("attendance_events").select("id,work_date,kind,occurred_at,device_occurred_at,received_at,source,location_flag,distance_m,evidence_status,review_status,review_note", { count: "exact" }).eq("employee_id", actor.employeeId).order("work_date", { ascending: false }).order("kind");
  if (from) query = query.gte("work_date", from); if (to) query = query.lte("work_date", to);
  const { data, count, error } = await query.range((page - 1) * size, page * size - 1);
  if (error) return jsonError(500, "ATTENDANCE_READ_FAILED", "Không thể tải lịch sử chấm công.", requestId);
  return Response.json({ data, page: { number: page, size, total: count ?? 0 }, request_id: requestId });
}
