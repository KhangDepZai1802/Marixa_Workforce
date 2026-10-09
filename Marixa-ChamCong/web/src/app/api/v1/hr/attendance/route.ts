import { randomUUID } from "node:crypto";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền xem bảng chấm công HR.", requestId);
  const url = new URL(request.url);
  const from = url.searchParams.get("from"); const to = url.searchParams.get("to");
  const status = url.searchParams.get("status"); const employeeId = url.searchParams.get("employee_id");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const size = Math.min(100, Math.max(1, Number(url.searchParams.get("page_size") ?? 50) || 50));
  if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) return jsonError(422, "INVALID_DATE_FILTER", "Ngày lọc phải theo định dạng YYYY-MM-DD.", requestId);
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("attendance_events").select("id,employee_id,work_date,kind,occurred_at,device_occurred_at,received_at,source,latitude,longitude,accuracy_m,distance_m,office_radius_m_at_capture,location_flag,evidence_status,review_status,review_note,employees(employee_code,full_name,department),attendance_photos(id,storage_path,expires_at,deleted_at)", { count: "exact" }).order("work_date", { ascending: false }).order("received_at", { ascending: false });
  if (from) query = query.gte("work_date", from);
  if (to) query = query.lte("work_date", to);
  if (status) query = query.eq("review_status", status);
  if (employeeId) query = query.eq("employee_id", employeeId);
  const { data, count, error } = await query.range((page - 1) * size, page * size - 1);
  if (error) return jsonError(500, "ATTENDANCE_READ_FAILED", "Không thể tải dữ liệu đối soát.", requestId);
  return Response.json({ data, page: { number: page, size, total: count ?? 0 }, request_id: requestId });
}
