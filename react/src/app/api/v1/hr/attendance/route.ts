import { createRequestId, jsonApiResponse, jsonError } from "@/server/api/http";
import { getActor } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPagination } from "@/server/api/pagination";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền xem bảng chấm công HR.", requestId);
  const url = new URL(request.url);
  const from = url.searchParams.get("from"); const to = url.searchParams.get("to");
  const status = url.searchParams.get("status"); const employeeId = url.searchParams.get("employee_id");
  const pagination = getPagination(url.searchParams, { defaultSize: 50, maxSize: 100 });
  if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) return jsonError(422, "INVALID_DATE_FILTER", "Ngày lọc phải theo định dạng YYYY-MM-DD.", requestId);
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("attendance_events").select("id,employee_id,work_date,kind,occurred_at,device_occurred_at,received_at,source,latitude,longitude,accuracy_m,distance_m,office_radius_m_at_capture,location_flag,evidence_status,review_status,review_note,employees!inner(employee_code,full_name,department),attendance_photos(id,storage_path,expires_at,deleted_at)", { count: "exact" }).order("work_date", { ascending: false }).order("received_at", { ascending: false });
  if (from) query = query.gte("work_date", from);
  if (to) query = query.lte("work_date", to);
  if (status) query = query.eq("review_status", status);
  const department = url.searchParams.get("department");
  if (department) query = query.eq("employees.department", department);
  if (employeeId) query = query.eq("employee_id", employeeId);
  const { data, count, error } = await query.range(pagination.from, pagination.to);
  if (error) return jsonError(500, "ATTENDANCE_READ_FAILED", "Không thể tải dữ liệu đối soát.", requestId);
  return jsonApiResponse({ data, page: { number: pagination.page, size: pagination.size, total: count ?? 0 }, request_id: requestId });
}
