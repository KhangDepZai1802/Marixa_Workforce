import { calculateAttendanceDay, type ApprovedInterval, type WorkPolicy } from "./timesheet";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

type Adjustment = { id: string; employee_id: string; source_event_id: string; source_period_id: string; work_date: string };
type Part = { date: string; part: "full" | "morning" | "afternoon" };
const businessTime = (date: string, time: string) => new Date(`${date}T${time.slice(0, 5)}:00+07:00`);

export async function getLateAdjustmentPreview(adjustment: Adjustment) {
  const db = createSupabaseServiceClient();
  const date = adjustment.work_date;
  const [period, event, events, corrections, leaves, overtime, policies, holiday, approved] = await Promise.all([
    db.from("timesheet_periods").select("id,year,month,status,version").eq("id", adjustment.source_period_id).single(),
    db.from("attendance_events").select("id,kind,occurred_at,device_occurred_at,received_at,review_status").eq("id", adjustment.source_event_id).single(),
    db.from("attendance_events").select("id,kind,occurred_at").eq("employee_id", adjustment.employee_id).eq("work_date", date),
    db.from("attendance_corrections").select("id,proposed_check_in,proposed_check_out,reviewed_at").eq("employee_id", adjustment.employee_id).eq("work_date", date).eq("status", "approved").order("reviewed_at", { ascending: false }).limit(1),
    db.from("leave_requests").select("id,day_parts").eq("employee_id", adjustment.employee_id).eq("status", "approved").lte("start_date", date).gte("end_date", date),
    db.from("overtime_requests").select("id,start_at,end_at").eq("employee_id", adjustment.employee_id).eq("work_date", date).eq("status", "approved"),
    db.from("work_policies").select("id,start_time,lunch_start,lunch_end,end_time,working_weekdays,late_grace_minutes").lte("effective_from", date).or(`effective_to.is.null,effective_to.gte.${date}`).order("effective_from", { ascending: false }).limit(1),
    db.from("holidays").select("is_working_override").eq("holiday_date", date).maybeSingle(),
    db.from("timesheet_adjustments").select("id,regular_minutes_delta,overtime_minutes_delta").eq("employee_id", adjustment.employee_id).eq("work_date", date).eq("source_period_id", adjustment.source_period_id).eq("status", "approved"),
  ]);
  if ([period.error, event.error, events.error, corrections.error, leaves.error, overtime.error, policies.error, holiday.error, approved.error].some(Boolean)) throw new Error("Không đọc được dữ liệu đối soát kỳ gốc.");
  if (period.data?.status !== "locked") throw new Error("Kỳ gốc không còn khóa; cần tải lại danh sách.");
  const policy = policies.data?.[0];
  if (!policy) throw new Error("Thiếu ca hiệu lực cho ngày gốc.");
  const snapshot = await db.from("timesheet_days").select("id,regular_minutes,overtime_minutes,leave_days,exceptions")
    .eq("period_id", adjustment.source_period_id).eq("snapshot_version", period.data.version)
    .eq("employee_id", adjustment.employee_id).eq("work_date", date).is("previous_period_source_period_id", null).maybeSingle();
  if (snapshot.error || !snapshot.data) throw new Error("Thiếu snapshot ngày công của kỳ đã khóa.");
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
  const isWorkday = holiday.data ? holiday.data.is_working_override : policy.working_weekdays.includes(weekday);
  const workPolicy: WorkPolicy = { start: policy.start_time.slice(0, 5), lunchStart: policy.lunch_start.slice(0, 5), lunchEnd: policy.lunch_end.slice(0, 5), end: policy.end_time.slice(0, 5), lateGraceMinutes: policy.late_grace_minutes };
  const parts: ApprovedInterval[] = (leaves.data ?? []).flatMap(leave => ((leave.day_parts ?? []) as Part[]).filter(p => p.date === date).map(part => ({
    start: businessTime(date, part.part === "afternoon" ? workPolicy.lunchEnd : workPolicy.start),
    end: businessTime(date, part.part === "morning" ? workPolicy.lunchStart : workPolicy.end),
    days: part.part === "full" ? 1 : 0.5,
  })));
  const correction = corrections.data?.[0];
  const calculated = calculateAttendanceDay({
    checkIn: events.data?.find(e => e.kind === "check_in") ? new Date(events.data.find(e => e.kind === "check_in")!.occurred_at) : null,
    checkOut: events.data?.find(e => e.kind === "check_out") ? new Date(events.data.find(e => e.kind === "check_out")!.occurred_at) : null,
    approvedCorrection: correction ? { checkIn: correction.proposed_check_in ? new Date(correction.proposed_check_in) : null, checkOut: correction.proposed_check_out ? new Date(correction.proposed_check_out) : null } : null,
    approvedLeave: parts,
    approvedOvertime: (overtime.data ?? []).map(o => ({ start: new Date(o.start_at), end: new Date(o.end_at) })),
    policy: workPolicy, timeZone: "Asia/Ho_Chi_Minh", isWorkday,
  });
  const compensatedRegular = (approved.data ?? []).reduce((sum, row) => sum + row.regular_minutes_delta, 0);
  const compensatedOvertime = (approved.data ?? []).reduce((sum, row) => sum + row.overtime_minutes_delta, 0);
  return {
    source_snapshot: snapshot.data,
    event: event.data,
    event_count: events.data?.length ?? 0,
    approved_correction_id: correction?.id ?? null,
    approved_adjustment_count: approved.data?.length ?? 0,
    compensated_regular_minutes: compensatedRegular,
    compensated_overtime_minutes: compensatedOvertime,
    calculated_regular_minutes: calculated.regularMinutes,
    calculated_overtime_minutes: calculated.overtimeMinutes,
    suggested_regular_minutes_delta: calculated.regularMinutes - snapshot.data.regular_minutes - compensatedRegular,
    suggested_overtime_minutes_delta: calculated.overtimeMinutes - snapshot.data.overtime_minutes - compensatedOvertime,
    complete: calculated.complete,
    exceptions: calculated.exceptions,
  };
}
