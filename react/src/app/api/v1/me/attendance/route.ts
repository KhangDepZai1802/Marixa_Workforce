import { createRequestId, jsonApiResponse, jsonError } from "@/server/api/http";
import { getActor } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPagination } from "@/server/api/pagination";
export async function GET(request: Request) {
  const requestId = createRequestId(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.mustChangePassword) return jsonError(403, "PASSWORD_CHANGE_REQUIRED", "Vui lòng đổi mật khẩu trước khi tiếp tục.", requestId);
  if (!actor.employeeId) return jsonError(403, "EMPLOYEE_PROFILE_REQUIRED", "Tài khoản chưa có hồ sơ nhân viên.", requestId);
  const url = new URL(request.url); const from = url.searchParams.get("from"); const to = url.searchParams.get("to");
  if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) return jsonError(422, "INVALID_DATE_FILTER", "Ngày lọc cần theo định dạng YYYY-MM-DD.", requestId);
  const pagination = getPagination(url.searchParams, { defaultSize: 62, maxSize: 62 });
  const supabase = await createSupabaseServerClient();
  let query = supabase.from("attendance_events").select("id,work_date,kind,occurred_at,device_occurred_at,received_at,source,location_flag,distance_m,evidence_status,review_status,review_note", { count: "exact" }).eq("employee_id", actor.employeeId).order("work_date", { ascending: false }).order("kind");
  if (from) query = query.gte("work_date", from); if (to) query = query.lte("work_date", to);
  const { data, count, error } = await query.range(pagination.from, pagination.to);
  if (error) return jsonError(500, "ATTENDANCE_READ_FAILED", "Không thể tải lịch sử chấm công.", requestId);
  return jsonApiResponse({ data, page: { number: pagination.page, size: pagination.size, total: count ?? 0 }, request_id: requestId });
}
