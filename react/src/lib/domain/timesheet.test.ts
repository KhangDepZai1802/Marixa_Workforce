import { strict as assert } from "node:assert";
import { test } from "node:test";
import { calculateAttendanceDay, type AttendanceDayInput } from "./timesheet";

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

test("an incomplete attendance day never invents worked or overtime minutes", () => {
  const result = calculateAttendanceDay(base("08:00", null));
  assert.equal(result.complete, false);
  assert.equal(result.regularMinutes, 0);
  assert.equal(result.overtimeMinutes, 0);
  assert.deepEqual(result.exceptions, ["incomplete_attendance"]);
});
