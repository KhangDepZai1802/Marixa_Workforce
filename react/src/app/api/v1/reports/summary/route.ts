import { createRequestId, jsonApiResponse, jsonError } from "@/server/api/http";
import { getActor } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestId = createRequestId();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (actor.mustChangePassword) return jsonError(403, "PASSWORD_CHANGE_REQUIRED", "Vui lòng đổi mật khẩu.", requestId);
  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? "";
  const mine = url.searchParams.get("scope") !== "all";
  if (!/^(20\d{2}|21\d{2}|2200)-(0[1-9]|1[0-2])$/.test(month)) return jsonError(422, "INVALID_MONTH", "Chọn tháng hợp lệ.", requestId);
  if ((!mine && actor.role === "employee") || (mine && !actor.employeeId)) return jsonError(403, "FORBIDDEN", "Không có quyền xem báo cáo này.", requestId);
  const db = await createSupabaseServerClient();
  const [year, monthNumber] = month.split("-").map(Number);
  const period = await db.from("timesheet_periods").select("id,status,version").eq("year", year).eq("month", monthNumber).maybeSingle();
  if (period.error) return jsonError(503, "REPORT_READ_FAILED", "Không đọc được kỳ công.", requestId);
  if (!period.data) return jsonApiResponse({ data: { period: null, days: [] }, request_id: requestId });
  let query = db.from("timesheet_days").select("id,work_date,regular_minutes,overtime_minutes,overtime_kind,previous_period_regular_adjustment,previous_period_overtime_adjustment,previous_period_source_period_id")
    .eq("period_id", period.data.id).eq("snapshot_version", period.data.version).order("work_date").order("id");
  if (mine) query = query.eq("employee_id", actor.employeeId!);
  // Fetch all pages rather than silently truncating a month at PostgREST's row limit.
  const days = [];
  for (let start = 0; ; start += 500) {
    const result = await query.range(start, start + 499);
    if (result.error) return jsonError(503, "REPORT_READ_FAILED", "Không đọc được bảng công.", requestId);
    days.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) break;
  }
  return jsonApiResponse({ data: { period: period.data, days }, request_id: requestId });
}
