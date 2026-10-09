import { randomUUID } from "node:crypto";
import { getActor, jsonError } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const todayInBusinessZone = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
export async function GET() {
  const requestId = randomUUID();
  const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền xem dashboard HR.", requestId);
  const today = todayInBusinessZone();
  const supabase = await createSupabaseServerClient();
  const [employees, events, pendingLeave, pendingOvertime, pendingCorrections, pendingAdjustments, period, policy, todayLeave, todayCorrections, holiday] = await Promise.all([
    supabase.from("employees").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("attendance_events").select("id,employee_id,kind,occurred_at,location_flag,evidence_status,review_status").eq("work_date", today),
    supabase.from("leave_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("overtime_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("attendance_corrections").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("timesheet_adjustments").select("id", { count: "exact", head: true }).eq("status", "pending_review"),
    supabase.from("timesheet_periods").select("id,year,month,status,version").order("year", { ascending: false }).order("month", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("work_policies").select("start_time,late_grace_minutes,working_weekdays").lte("effective_from", today).or(`effective_to.is.null,effective_to.gte.${today}`).order("effective_from", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("leave_requests").select("employee_id,day_parts").eq("status", "approved").lte("start_date", today).gte("end_date", today),
    supabase.from("attendance_corrections").select("employee_id,proposed_check_in").eq("status", "approved").eq("work_date", today),
    supabase.from("holidays").select("is_working_override").eq("holiday_date", today).maybeSingle(),
  ]);
  if (employees.error || events.error || pendingLeave.error || pendingOvertime.error || pendingCorrections.error || pendingAdjustments.error || period.error || policy.error || todayLeave.error || todayCorrections.error || holiday.error)
    return jsonError(500, "DASHBOARD_READ_FAILED", "Không thể tải dashboard HR.", requestId);
  const data = events.data ?? [];
  const checkedIn = new Set(data.filter(e => e.kind === "check_in").map(e => e.employee_id));
  const unresolvedEvents = data.filter(e => e.review_status === "needs_review" || e.evidence_status === "pending" || e.evidence_status === "failed").length;
  const scheduledStart = policy.data?.start_time?.slice(0, 5) ?? "08:00";
  const scheduledMinutes = Number(scheduledStart.slice(0, 2)) * 60 + Number(scheduledStart.slice(3, 5)) + (policy.data?.late_grace_minutes ?? 0);
  const correctionsByEmployee = new Map((todayCorrections.data ?? []).map(c => [c.employee_id, c.proposed_check_in]));
  const leaveParts = (todayLeave.data ?? []).flatMap(r => (r.day_parts as {date:string;part:string}[]).filter(p => p.date === today).map(p => ({ employeeId: r.employee_id, part: p.part })));
  const morningLeave = new Set(leaveParts.filter(p => p.part !== "afternoon").map(p => p.employeeId));
  const fullDayLeave = new Set(leaveParts.filter(p => p.part === "full").map(p => p.employeeId));
  const checkedInExpected = new Set([...checkedIn].filter(id => !fullDayLeave.has(id)));
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  const scheduledWeekday = (policy.data?.working_weekdays ?? [1,2,3,4,5,6]).includes(weekday === 0 ? 7 : weekday);
  const isWorkingDay = holiday.data ? holiday.data.is_working_override : scheduledWeekday;
  const lateCount = data.filter(e => {
    if (e.kind !== "check_in" || morningLeave.has(e.employee_id)) return false;
    const timestamp = correctionsByEmployee.get(e.employee_id) ?? e.occurred_at;
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date(timestamp));
    const hour = Number(parts.find(part => part.type === "hour")?.value ?? 0);
    const minute = Number(parts.find(part => part.type === "minute")?.value ?? 0);
    const second = Number(parts.find(part => part.type === "second")?.value ?? 0);
    return hour * 3600 + minute * 60 + second > scheduledMinutes * 60;
  }).length;
  return Response.json({ data: {
    date: today, active_employees: employees.count ?? 0, checked_in: checkedIn.size,
    not_checked_in: isWorkingDay ? Math.max(0, (employees.count ?? 0) - fullDayLeave.size - checkedInExpected.size) : 0,
    late: lateCount,
    outside_office: data.filter(e => e.location_flag === "outside").length,
    unresolved_evidence_or_sync: unresolvedEvents,
    pending_requests: (pendingLeave.count ?? 0) + (pendingOvertime.count ?? 0) + (pendingCorrections.count ?? 0),
    pending_prior_period_adjustments: pendingAdjustments.count ?? 0,
    timesheet_period: period.data ?? null,
  }, request_id: requestId });
}
