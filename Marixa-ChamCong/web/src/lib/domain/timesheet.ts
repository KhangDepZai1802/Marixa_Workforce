export type WorkPolicy = {
  start: string;
  lunchStart: string;
  lunchEnd: string;
  end: string;
  lateGraceMinutes: number;
};

export type ApprovedInterval = { start: Date; end: Date; days?: number };
export type AttendanceDayInput = {
  checkIn: Date | null;
  checkOut: Date | null;
  approvedCorrection?: { checkIn: Date | null; checkOut: Date | null } | null;
  approvedLeave: ApprovedInterval[];
  approvedOvertime: ApprovedInterval[];
  policy: WorkPolicy;
  timeZone: string;
  isWorkday?: boolean;
};

export type AttendanceDayResult = {
  complete: boolean;
  regularMinutes: number;
  overtimeMinutes: number;
  lateMinutes: number;
  earlyMinutes: number;
  leaveDays: number;
  exceptions: string[];
};

type Range = { start: number; end: number };
type LocalParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const minuteOfDay = (value: string) => {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();
function localParts(date: Date, timeZone: string): LocalParts {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    });
    formatterCache.set(timeZone, formatter);
  }
  const values = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

// Convert an instant to a wall-clock axis for the business timezone. Marixa's
// configured timezone has no DST, so this preserves elapsed seconds while
// allowing daily work windows to be compared without losing seconds.
function localWallMilliseconds(date: Date, timeZone: string): number {
  const parts = localParts(date, timeZone);
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, date.getUTCMilliseconds());
}

function localDayStart(date: Date, timeZone: string): number {
  const parts = localParts(date, timeZone);
  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function sameLocalDay(left: Date, right: Date, timeZone: string): boolean {
  return localDayStart(left, timeZone) === localDayStart(right, timeZone);
}

function workWindows(dayStart: number, policy: WorkPolicy): Range[] {
  return [
    { start: dayStart + minuteOfDay(policy.start) * 60_000, end: dayStart + minuteOfDay(policy.lunchStart) * 60_000 },
    { start: dayStart + minuteOfDay(policy.lunchEnd) * 60_000, end: dayStart + minuteOfDay(policy.end) * 60_000 },
  ];
}

function mergeRanges(ranges: Range[]): Range[] {
  const sorted = ranges.filter((range) => range.end > range.start).sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  for (const range of sorted) {
    const last = merged.at(-1);
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

function overlap(start: number, end: number, ranges: Range[]): number {
  return ranges.reduce((total, range) => total + Math.max(0, Math.min(end, range.end) - Math.max(start, range.start)), 0);
}

function minutes(milliseconds: number): number {
  return Math.floor(Math.max(0, milliseconds) / 60_000);
}

function emptyDay(leaveDays: number, exceptions: string[], complete = false): AttendanceDayResult {
  return { complete, regularMinutes: 0, overtimeMinutes: 0, lateMinutes: 0, earlyMinutes: 0, leaveDays, exceptions };
}

export function calculateAttendanceDay(input: AttendanceDayInput): AttendanceDayResult {
  const exceptions: string[] = [];
  const checkIn = input.approvedCorrection ? input.approvedCorrection.checkIn : input.checkIn;
  const checkOut = input.approvedCorrection ? input.approvedCorrection.checkOut : input.checkOut;
  const leaveDays = input.approvedLeave.reduce((sum, leave) => sum + (leave.days ?? 0), 0);

  if (!(input.isWorkday ?? true) && !checkIn && !checkOut) return emptyDay(leaveDays, [], true);
  if (!checkIn && !checkOut && leaveDays >= 1) return emptyDay(leaveDays, [], true);
  if (!checkIn || !checkOut) return emptyDay(leaveDays, ["incomplete_attendance"]);
  if (checkOut <= checkIn || !sameLocalDay(checkIn, checkOut, input.timeZone))
    return emptyDay(leaveDays, ["invalid_attendance_interval"]);

  const dayStart = localDayStart(checkIn, input.timeZone);
  const actualStart = localWallMilliseconds(checkIn, input.timeZone);
  const actualEnd = localWallMilliseconds(checkOut, input.timeZone);
  const scheduled = workWindows(dayStart, input.policy);
  const leaveRanges = mergeRanges(input.approvedLeave.map(({ start, end }) => ({
    start: localWallMilliseconds(start, input.timeZone),
    end: localWallMilliseconds(end, input.timeZone),
  })));

  let regularSeconds = 0;
  let overtimeSeconds = 0;
  let lateSeconds = 0;
  let earlySeconds = 0;

  if (input.isWorkday ?? true) {
    for (const window of scheduled) {
      const start = Math.max(actualStart, window.start);
      const end = Math.min(actualEnd, window.end);
      if (end > start) regularSeconds += Math.max(0, end - start - overlap(start, end, leaveRanges));
    }

    const approvedOvertime = mergeRanges(input.approvedOvertime.map(({ start, end }) => ({
      start: localWallMilliseconds(start, input.timeZone),
      end: localWallMilliseconds(end, input.timeZone),
    })));
    const overtimeWindow = { start: actualStart, end: actualEnd };
    for (const interval of approvedOvertime) {
      const start = Math.max(overtimeWindow.start, interval.start);
      const end = Math.min(overtimeWindow.end, interval.end);
      if (end > start) overtimeSeconds += Math.max(0, end - start - overlap(start, end, scheduled));
    }

    const graceMilliseconds = input.policy.lateGraceMinutes * 60_000;
    const scheduledStart = dayStart + minuteOfDay(input.policy.start) * 60_000;
    const scheduledEnd = dayStart + minuteOfDay(input.policy.end) * 60_000;
    if (actualStart > scheduledStart) {
      const lateEnd = Math.min(actualStart, scheduledEnd);
      lateSeconds = Math.max(0, overlap(scheduledStart, lateEnd, scheduled) - overlap(scheduledStart, lateEnd, leaveRanges) - graceMilliseconds);
    }
    if (actualEnd < scheduledEnd) {
      earlySeconds = Math.max(0, overlap(actualEnd, scheduledEnd, scheduled) - overlap(actualEnd, scheduledEnd, leaveRanges));
    }
  } else {
    // Rest days and holidays count actual paired work as overtime. The midday
    // break remains excluded; this rule does not require an overtime request.
    overtimeSeconds = Math.max(0, actualEnd - actualStart - overlap(actualStart, actualEnd, [
      { start: dayStart + 12 * 60 * 60_000, end: dayStart + 13 * 60 * 60_000 },
    ]));
  }

  if (input.approvedLeave.some(({ start, end }) => {
    const leaveStart = localWallMilliseconds(start, input.timeZone);
    const leaveEnd = localWallMilliseconds(end, input.timeZone);
    return Math.min(actualEnd, leaveEnd) > Math.max(actualStart, leaveStart);
  })) exceptions.push("attendance_overlaps_approved_leave");

  return {
    complete: true,
    regularMinutes: minutes(regularSeconds),
    overtimeMinutes: minutes(overtimeSeconds),
    lateMinutes: minutes(lateSeconds),
    earlyMinutes: minutes(earlySeconds),
    leaveDays,
    exceptions,
  };
}
