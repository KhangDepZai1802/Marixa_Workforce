export type WorkPolicy = {
  start: string; lunchStart: string; lunchEnd: string; end: string; lateGraceMinutes: number;
};
export type ApprovedInterval = { start: Date; end: Date; days?: number };
export type AttendanceDayInput = {
  checkIn: Date | null; checkOut: Date | null;
  approvedCorrection?: { checkIn: Date | null; checkOut: Date | null } | null;
  approvedLeave: ApprovedInterval[];
  approvedOvertime: ApprovedInterval[];
  policy: WorkPolicy;
  timeZone: string;
};
export type AttendanceDayResult = {
  complete: boolean; regularMinutes: number; overtimeMinutes: number; lateMinutes: number; earlyMinutes: number;
  leaveDays: number; exceptions: string[];
};

const minuteOfDay = (value: string) => { const [h, m] = value.split(":").map(Number); return h * 60 + m; };
const localMinute = (date: Date, timeZone: string) => {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(date);
  return Number(parts.find(p => p.type === "hour")?.value) * 60 + Number(parts.find(p => p.type === "minute")?.value);
};
const overlap = (a0: number, a1: number, b0: number, b1: number) => Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
const intervalForLocalWindow = (date: Date, timeZone: string, from: string, to: string) => {
  // Workday policies are day based. Represent their local clock positions on a
  // minute axis, so lunch and approved leave never count as regular work.
  const base = localMinute(date, timeZone);
  const start = minuteOfDay(from);
  const end = minuteOfDay(to);
  return { start: base - (base % 1440) + start, end: base - (base % 1440) + end };
};

export function calculateAttendanceDay(input: AttendanceDayInput): AttendanceDayResult {
  const exceptions: string[] = [];
  const checkIn = input.approvedCorrection?.checkIn ?? input.checkIn;
  const checkOut = input.approvedCorrection?.checkOut ?? input.checkOut;
  const leaveDays = input.approvedLeave.reduce((sum, leave) => sum + (leave.days ?? 0), 0);
  if (!checkIn && !checkOut && leaveDays >= 1) return {
    complete: true, regularMinutes: 0, overtimeMinutes: 0, lateMinutes: 0, earlyMinutes: 0,
    leaveDays, exceptions: [],
  };
  if (!checkIn || !checkOut) return {
    complete: false, regularMinutes: 0, overtimeMinutes: 0, lateMinutes: 0, earlyMinutes: 0,
    leaveDays, exceptions: ["incomplete_attendance"],
  };
  if (checkOut <= checkIn) return { complete: false, regularMinutes: 0, overtimeMinutes: 0, lateMinutes: 0, earlyMinutes: 0, leaveDays: 0, exceptions: ["invalid_attendance_interval"] };
  const inMinute = localMinute(checkIn, input.timeZone);
  const outMinute = localMinute(checkOut, input.timeZone);
  const workWindows = [
    intervalForLocalWindow(checkIn, input.timeZone, input.policy.start, input.policy.lunchStart),
    intervalForLocalWindow(checkIn, input.timeZone, input.policy.lunchEnd, input.policy.end),
  ];
  let regular = 0;
  for (const window of workWindows) {
    const actual = overlap(inMinute, outMinute, window.start, window.end);
    const leave = input.approvedLeave.reduce((sum, item) => sum + overlap(
      minuteOfDay(new Intl.DateTimeFormat("en-GB", { timeZone: input.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(item.start)),
      minuteOfDay(new Intl.DateTimeFormat("en-GB", { timeZone: input.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(item.end)),
      window.start, window.end), 0);
    regular += Math.max(0, actual - leave);
  }
  const overtime = input.approvedOvertime.reduce((sum, item) => {
    const approvedStart = localMinute(item.start, input.timeZone);
    const approvedEnd = localMinute(item.end, input.timeZone);
    let workedOutsideRegular = Math.max(0, Math.min(outMinute, approvedEnd) - Math.max(inMinute, approvedStart));
    for (const window of workWindows) workedOutsideRegular -= overlap(Math.max(inMinute, approvedStart), Math.min(outMinute, approvedEnd), window.start, window.end);
    return sum + Math.max(0, workedOutsideRegular);
  }, 0);
  const morningLeave = input.approvedLeave.some(item => localMinute(item.start, input.timeZone) <= minuteOfDay(input.policy.start) && localMinute(item.end, input.timeZone) >= minuteOfDay(input.policy.lunchStart));
  const afternoonLeave = input.approvedLeave.some(item => localMinute(item.start, input.timeZone) <= minuteOfDay(input.policy.lunchEnd) && localMinute(item.end, input.timeZone) >= minuteOfDay(input.policy.end));
  const lateMinutes = morningLeave ? 0 : Math.max(0, inMinute - minuteOfDay(input.policy.start) - input.policy.lateGraceMinutes);
  const earlyMinutes = afternoonLeave ? 0 : Math.max(0, minuteOfDay(input.policy.end) - outMinute);
  const overlapLeave = input.approvedLeave.some(item => overlap(inMinute, outMinute, localMinute(item.start, input.timeZone), localMinute(item.end, input.timeZone)) > 0);
  if (overlapLeave) exceptions.push("attendance_overlaps_approved_leave");
  return {
    complete: true, regularMinutes: Math.floor(regular), overtimeMinutes: Math.floor(overtime),
    lateMinutes: Math.floor(lateMinutes), earlyMinutes: Math.floor(earlyMinutes),
    leaveDays: input.approvedLeave.reduce((sum, item) => sum + (item.days ?? 0), 0), exceptions,
  };
}
