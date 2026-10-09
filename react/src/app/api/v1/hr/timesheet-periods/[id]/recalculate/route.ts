import { createHash, randomUUID } from "node:crypto";
import { getActor, jsonError } from "@/lib/auth";
import { calculateAttendanceDay, type ApprovedInterval, type WorkPolicy } from "@/lib/domain/timesheet";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type RouteContext = { params: Promise<{ id: string }> };
type Part = { date: string; part: "full" | "morning" | "afternoon" };
const inBusinessTime = (date: string, time: string) => new Date(`${date}T${time.slice(0, 5)}:00+07:00`);
export async function POST(_request: Request, context: RouteContext) {
  const requestId = randomUUID(); const actor = await getActor();
  if (!actor) return jsonError(401, "UNAUTHENTICATED", "Vui lòng đăng nhập.", requestId);
  if (!new Set(["hr", "admin"]).has(actor.role) || actor.mustChangePassword) return jsonError(403, "FORBIDDEN", "Bạn không có quyền tính lại kỳ công.", requestId);
  const { id } = await context.params; const service = createSupabaseServiceClient();
  const [{ data: period }, { data: reviewer }] = await Promise.all([
    service.from("timesheet_periods").select("id,year,month,status,version").eq("id", id).maybeSingle(),
    service.from("app_users").select("id").eq("auth_user_id", actor.userId).single(),
  ]);
  if (!period) return jsonError(404, "TIMESHEET_NOT_FOUND", "Không tìm thấy kỳ công.", requestId);
  if (!reviewer) return jsonError(403, "FORBIDDEN", "Tài khoản chưa sẵn sàng.", requestId);
  if (period.status !== "open") return jsonError(409, "TIMESHEET_NOT_OPEN", "Chỉ có thể tính lại kỳ đang mở.", requestId);
  const first = `${period.year}-${String(period.month).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(period.year, period.month, 0)).toISOString().slice(0, 10);
  const [employeesResult, policyResult, holidayResult, eventResult, correctionResult, leaveResult, overtimeResult, adjustmentResult] = await Promise.all([
    service.from("employees").select("id,employee_code,full_name,department,status").eq("status", "active"),
    service.from("work_policies").select("id,effective_from,effective_to,start_time,lunch_start,lunch_end,end_time,working_weekdays,late_grace_minutes").lte("effective_from", last).or(`effective_to.is.null,effective_to.gte.${first}`).order("effective_from"),
    service.from("holidays").select("holiday_date,is_working_override").gte("holiday_date", first).lte("holiday_date", last),
    service.from("attendance_events").select("id,employee_id,work_date,kind,occurred_at,source,location_flag,evidence_status,review_status,updated_at").gte("work_date", first).lte("work_date", last),
    service.from("attendance_corrections").select("id,employee_id,work_date,proposed_check_in,proposed_check_out,status").eq("status", "approved").gte("work_date", first).lte("work_date", last),
    service.from("leave_requests").select("id,employee_id,leave_type_id,start_date,end_date,day_parts,total_days,status").eq("status", "approved").lte("start_date", last).gte("end_date", first),
    service.from("overtime_requests").select("id,employee_id,work_date,start_at,end_at,status").eq("status", "approved").gte("work_date", first).lte("work_date", last),
    service.from("timesheet_adjustments").select("id,employee_id,source_event_id,source_period_id,work_date,regular_minutes_delta,overtime_minutes_delta").eq("target_period_id", id).eq("status", "approved"),
  ]);
  const queryErrors = [employeesResult.error, policyResult.error, holidayResult.error, eventResult.error, correctionResult.error, leaveResult.error, overtimeResult.error, adjustmentResult.error];
  if (queryErrors.some(Boolean)) return jsonError(500, "TIMESHEET_SOURCE_READ_FAILED", "Không thể đọc dữ liệu để tính bảng công.", requestId);
  const employees = employeesResult.data ?? []; const policies = policyResult.data ?? [];
  if (!employees.length && !(adjustmentResult.data ?? []).length) return jsonError(409, "NO_ACTIVE_EMPLOYEES", "Chưa có nhân viên đang hoạt động.", requestId);
  const holidays = new Map((holidayResult.data ?? []).map(x => [x.holiday_date, x.is_working_override]));
  const events = eventResult.data ?? []; const corrections = correctionResult.data ?? []; const leaves = leaveResult.data ?? []; const overtimes = overtimeResult.data ?? [];
  const adjustments = adjustmentResult.data ?? [];
  const adjustmentEmployeeIds = [...new Set(adjustments.map(adjustment => adjustment.employee_id))];
  const adjustmentEmployeesResult = adjustmentEmployeeIds.length
    ? await service.from("employees").select("id,employee_code,full_name,department").in("id", adjustmentEmployeeIds)
    : { data: [], error: null };
  if (adjustmentEmployeesResult.error) return jsonError(500, "TIMESHEET_ADJUSTMENT_READ_FAILED", "Không thể đọc nhân viên của khoản điều chỉnh kỳ trước.", requestId);
  const adjustmentEmployees = new Map((adjustmentEmployeesResult.data ?? []).map(employee => [employee.id, employee]));
  const days: Record<string, unknown>[] = [];
  for (let day = 1; day <= new Date(Date.UTC(period.year, period.month, 0)).getUTCDate(); day++) {
    const date = `${period.year}-${String(period.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    const policy = [...policies].reverse().find(p => p.effective_from <= date && (!p.effective_to || p.effective_to >= date));
    if (!policy) return jsonError(409, "WORK_POLICY_MISSING", `Chưa cấu hình chính sách giờ làm cho ${date}.`, requestId);
    const weekdayIso = weekday === 0 ? 7 : weekday;
    const isWorkday = holidays.has(date) ? holidays.get(date)! : policy.working_weekdays.includes(weekdayIso);
    const workPolicy: WorkPolicy = { start: policy.start_time.slice(0, 5), lunchStart: policy.lunch_start.slice(0, 5), lunchEnd: policy.lunch_end.slice(0, 5), end: policy.end_time.slice(0, 5), lateGraceMinutes: policy.late_grace_minutes };
    for (const employee of employees) {
      const dailyEvents = events.filter(e => e.employee_id === employee.id && e.work_date === date);
      const checkInEvent = dailyEvents.find(e => e.kind === "check_in"); const checkOutEvent = dailyEvents.find(e => e.kind === "check_out");
      const correction = corrections.find(c => c.employee_id === employee.id && c.work_date === date);
      const parts: ApprovedInterval[] = leaves.flatMap(request => {
        if (request.employee_id !== employee.id) return [];
        return (request.day_parts as Part[]).filter(p => p.date === date).map(part => ({
          start: inBusinessTime(date, part.part === "afternoon" ? workPolicy.lunchEnd : workPolicy.start),
          end: inBusinessTime(date, part.part === "morning" ? workPolicy.lunchStart : workPolicy.end),
          days: part.part === "full" ? 1 : 0.5,
        }));
      });
      const approvedOvertime = overtimes.filter(o => o.employee_id === employee.id && o.work_date === date).map(o => ({ start: new Date(o.start_at), end: new Date(o.end_at) }));
      const result = calculateAttendanceDay({
        checkIn: checkInEvent ? new Date(checkInEvent.occurred_at) : null,
        checkOut: checkOutEvent ? new Date(checkOutEvent.occurred_at) : null,
        approvedCorrection: correction ? { checkIn: correction.proposed_check_in ? new Date(correction.proposed_check_in) : null, checkOut: correction.proposed_check_out ? new Date(correction.proposed_check_out) : null } : null,
        approvedLeave: parts, approvedOvertime, policy: workPolicy, timeZone: "Asia/Ho_Chi_Minh", isWorkday,
      });
      const exceptions = new Set(result.exceptions);
      if (isWorkday && !dailyEvents.length && result.leaveDays < 1) exceptions.add("missing_attendance");
      for (const event of dailyEvents) {
        if (event.source === "offline" || event.review_status === "needs_review") exceptions.add("offline_sync_review");
        if (event.evidence_status === "pending") exceptions.add("photo_pending");
        if (event.evidence_status === "failed") exceptions.add("photo_failed");
      }
      const source = { policy: policy.id, event: dailyEvents.map(e => [e.id,e.updated_at]), correction: correction?.id ?? null, leave: leaves.filter(l => l.employee_id === employee.id && (l.day_parts as Part[]).some(p => p.date === date)).map(l => l.id), overtime: approvedOvertime.map(o => [o.start.toISOString(),o.end.toISOString()]), holiday: holidays.get(date) ?? null };
      const sourceRevision = createHash("sha256").update(JSON.stringify(source)).digest("hex");
      days.push({ employee_id: employee.id, work_date: date, regular_minutes: result.regularMinutes, overtime_minutes: result.overtimeMinutes, leave_days: result.leaveDays, late_minutes: result.lateMinutes, early_minutes: result.earlyMinutes, exceptions: [...exceptions], source_revision: sourceRevision, employee_code_snapshot: employee.employee_code, full_name_snapshot: employee.full_name, department_snapshot: employee.department, previous_period_regular_adjustment: 0, previous_period_overtime_adjustment: 0, previous_period_source_period_id: null });
    }
  }
  const adjustmentGroups = new Map<string, { employeeId: string; workDate: string; sourcePeriodId: string; regular: number; overtime: number; ids: string[] }>();
  for (const adjustment of adjustments) {
    const key = `${adjustment.employee_id}:${adjustment.work_date}:${adjustment.source_period_id}`;
    const group: { employeeId: string; workDate: string; sourcePeriodId: string; regular: number; overtime: number; ids: string[] } = adjustmentGroups.get(key) ?? { employeeId: adjustment.employee_id, workDate: adjustment.work_date, sourcePeriodId: adjustment.source_period_id, regular: 0, overtime: 0, ids: [] };
    group.regular += adjustment.regular_minutes_delta;
    group.overtime += adjustment.overtime_minutes_delta;
    group.ids.push(adjustment.id);
    adjustmentGroups.set(key, group);
  }
  for (const adjustment of adjustmentGroups.values()) {
    const employee = adjustmentEmployees.get(adjustment.employeeId);
    if (!employee) return jsonError(409, "ADJUSTMENT_EMPLOYEE_MISSING", "Không tìm thấy hồ sơ nhân viên của khoản điều chỉnh.", requestId);
    const sourceRevision = createHash("sha256").update(JSON.stringify({ adjustments: adjustment.ids.sort(), regular: adjustment.regular, overtime: adjustment.overtime })).digest("hex");
    days.push({ employee_id: adjustment.employeeId, work_date: adjustment.workDate, regular_minutes: 0, overtime_minutes: 0, leave_days: 0, late_minutes: 0, early_minutes: 0, exceptions: [], source_revision: sourceRevision, employee_code_snapshot: employee.employee_code, full_name_snapshot: employee.full_name, department_snapshot: employee.department, previous_period_regular_adjustment: adjustment.regular, previous_period_overtime_adjustment: adjustment.overtime, previous_period_source_period_id: adjustment.sourcePeriodId });
  }
  const { data: saved, error } = await service.rpc("replace_timesheet_snapshot", { p_period_id: id, p_version: period.version, p_actor_id: reviewer.id, p_days: days });
  if (error) return jsonError(error.code === "40001" ? 409 : 500, error.code === "40001" ? "TIMESHEET_CHANGED" : "TIMESHEET_SNAPSHOT_FAILED", "Không thể lưu snapshot bảng công.", requestId);
  return Response.json({ data: { period_id: id, version: period.version, rows: saved }, request_id: requestId });
}
