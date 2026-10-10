import { strict as assert } from "node:assert";
import { test } from "node:test";
import { calculateAttendanceDay, calculateLateMinutes, effectivePolicyOnDate, isPolicyWorkday, type AttendanceDayInput } from "./timesheet";

const policy = { start: "08:00", lunchStart: "12:00", lunchEnd: "13:00", end: "17:00", lateGraceMinutes: 0 };
const instant = (value: string) => new Date(`2026-10-09T${value.length === 5 ? `${value}:00` : value}+07:00`);
const base = (checkIn: string | null, checkOut: string | null): AttendanceDayInput => ({
  checkIn: checkIn ? instant(checkIn) : null,
  checkOut: checkOut ? instant(checkOut) : null,
  approvedLeave: [], approvedOvertime: [], policy, timeZone: "Asia/Ho_Chi_Minh",
});

test("a complete standard workday is 480 regular minutes", () => {
  assert.equal(calculateAttendanceDay(base("08:00", "17:00")).regularMinutes, 480);
});

test("seconds from both work windows are summed before flooring the daily minutes", () => {
  const input = base("08:00:30", "16:59:30");
  assert.equal(calculateAttendanceDay(input).regularMinutes, 479);
});

test("a one-minute late arrival is counted without rounding to a time block", () => {
  const result = calculateAttendanceDay(base("08:01", "17:00"));
  assert.equal(result.lateMinutes, 1);
  assert.equal(result.regularMinutes, 479);
});

test("a rest day counts paired work as overtime and excludes lunch", () => {
  const fullDay = base("08:00", "17:00");
  fullDay.isWorkday = false;
  assert.equal(calculateAttendanceDay(fullDay).overtimeMinutes, 480);

  const lunch = base("11:30", "13:30");
  lunch.isWorkday = false;
  assert.equal(calculateAttendanceDay(lunch).overtimeMinutes, 60);
});

test("an empty rest day is complete and does not create an absence exception", () => {
  const input = base(null, null);
  input.isWorkday = false;
  const result = calculateAttendanceDay(input);
  assert.equal(result.complete, true);
  assert.equal(result.overtimeMinutes, 0);
  assert.deepEqual(result.exceptions, []);
});

test("a rest day uses the effective shared shift lunch window", () => {
  const changed = base("09:00", "18:00");
  changed.isWorkday = false;
  changed.policy = { start: "09:00", lunchStart: "12:30", lunchEnd: "13:30", end: "18:00", lateGraceMinutes: 10 };
  assert.equal(calculateAttendanceDay(changed).overtimeMinutes, 480);

  const lunchOnly = base("12:00", "14:00");
  lunchOnly.isWorkday = false;
  lunchOnly.policy = changed.policy;
  assert.equal(calculateAttendanceDay(lunchOnly).overtimeMinutes, 60);
});

test("an incomplete attendance day never invents worked or overtime minutes", () => {
  const result = calculateAttendanceDay(base("08:00", null));
  assert.equal(result.complete, false);
  assert.equal(result.regularMinutes, 0);
  assert.equal(result.overtimeMinutes, 0);
  assert.deepEqual(result.exceptions, ["incomplete_attendance"]);
});

test("the changed shift applies its own work windows and ten-minute grace", () => {
  const input = base("09:10", "18:00");
  input.policy = { start: "09:00", lunchStart: "12:30", lunchEnd: "13:30", end: "18:00", lateGraceMinutes: 10 };
  const withinGrace = calculateAttendanceDay(input);
  assert.equal(withinGrace.regularMinutes, 470);
  assert.equal(withinGrace.lateMinutes, 0);
  input.checkIn = instant("09:11");
  const beyondGrace = calculateAttendanceDay(input);
  assert.equal(beyondGrace.regularMinutes, 469);
  assert.equal(beyondGrace.lateMinutes, 1);
  assert.equal(calculateLateMinutes(instant("09:11"), input.policy, [], input.timeZone), beyondGrace.lateMinutes);
});

test("dashboard and timesheet both floor lateness after seconds are measured", () => {
  const input = base("08:00:59", "17:00");
  assert.equal(calculateAttendanceDay(input).lateMinutes, 0);
  assert.equal(calculateLateMinutes(input.checkIn!, policy, [], input.timeZone), 0);
});

test("half-day leave removes only its approved window and avoids false lateness", () => {
  const input = base("13:00", "17:00");
  input.approvedLeave = [{ start: instant("08:00"), end: instant("12:00"), days: 0.5 }];
  const result = calculateAttendanceDay(input);
  assert.equal(result.complete, true);
  assert.equal(result.regularMinutes, 240);
  assert.equal(result.leaveDays, 0.5);
  assert.equal(result.lateMinutes, 0);
});

test("a one-sided approved correction retains the original other punch", () => {
  const input = base("08:00", null);
  input.approvedCorrection = { checkIn: null, checkOut: instant("17:00") };
  assert.equal(calculateAttendanceDay(input).regularMinutes, 480);
});

test("a fully approved correction can resolve a day with no original punches", () => {
  const input = base(null, null);
  input.approvedCorrection = { checkIn: instant("08:00"), checkOut: instant("17:00") };
  const result = calculateAttendanceDay(input);
  assert.equal(result.complete, true);
  assert.equal(result.regularMinutes, 480);
});

test("weekday overtime needs approval, is limited to actual time, and excludes shift time", () => {
  const input = base("08:00", "18:30");
  assert.equal(calculateAttendanceDay(input).overtimeMinutes, 0);
  input.approvedOvertime = [{ start: instant("16:30"), end: instant("19:00") }];
  assert.equal(calculateAttendanceDay(input).overtimeMinutes, 90);
});

test("a working-day override uses shift rules while a rest day ignores an approved request", () => {
  const input = base("08:00", "18:00");
  input.approvedOvertime = [{ start: instant("17:00"), end: instant("18:00") }];
  assert.deepEqual([calculateAttendanceDay(input).regularMinutes, calculateAttendanceDay(input).overtimeMinutes], [480, 60]);
  input.isWorkday = false;
  assert.deepEqual([calculateAttendanceDay(input).regularMinutes, calculateAttendanceDay(input).overtimeMinutes], [0, 540]);
});

test("approved leave overlapping attendance is counted once and flagged for review", () => {
  const input = base("08:00", "17:00");
  input.approvedLeave = [{ start: instant("08:00"), end: instant("12:00"), days: 0.5 }];
  const result = calculateAttendanceDay(input);
  assert.equal(result.regularMinutes, 240);
  assert.deepEqual(result.exceptions, ["attendance_overlaps_approved_leave"]);
});

test("shared shift changes only on its effective date", () => {
  const oldPolicy = { effective_from: "2026-01-01", effective_to: "2026-10-09", name: "old" };
  const newPolicy = { effective_from: "2026-10-10", effective_to: null, name: "new" };
  const versions = [newPolicy, oldPolicy];
  assert.equal(effectivePolicyOnDate(versions, "2026-10-09")?.name, "old");
  assert.equal(effectivePolicyOnDate(versions, "2026-10-10")?.name, "new");
  assert.equal(effectivePolicyOnDate(versions, "2025-12-31"), undefined);
});

test("holiday and make-up workday override the shared weekday list", () => {
  const weekdays = [1, 2, 3, 4, 5, 6];
  assert.equal(isPolicyWorkday("2026-10-11", weekdays), false);
  assert.equal(isPolicyWorkday("2026-10-11", weekdays, true), true);
  assert.equal(isPolicyWorkday("2026-10-10", weekdays, false), false);
});
