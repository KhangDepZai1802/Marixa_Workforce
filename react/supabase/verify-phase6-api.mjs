#!/usr/bin/env node
// Production-local API check using removable fixtures on the designated test project.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import ExcelJS from 'exceljs';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/).flatMap(line => {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    return match ? [[match[1], match[2].trim().replace(/^("|')(.*)\1$/, '$2')]] : [];
  }));
const credentials = JSON.parse(readFileSync(new URL('../.env.phase2.local', import.meta.url), 'utf8'));
if (env.NEXT_PUBLIC_SUPABASE_URL !== 'https://pkpwcpatuslfjyoivbuf.supabase.co' || credentials.ref !== 'pkpwcpatuslfjyoivbuf')
  throw new Error('Only the designated Supabase test project is allowed.');
const base = process.env.PHASE6_BASE_URL || 'http://localhost:3001';
if (base !== 'http://localhost:3001') throw new Error('Use the isolated production-local server on port 3001.');
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } });
const need = (result, label) => {
  if (result.error) throw new Error(`${label}: ${result.error.code ?? result.error.message}`);
  return result.data;
};
const month = '2096-06';
let employeeId, periodId;
const eventIds = [], holidayIds = [], correctionIds = [];
try {
  const login = await fetch(`${base}/api/v1/auth/login`, { method: 'POST',
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '0990000103', password: credentials.passwords['TEST-P2-HR'] }) });
  assert.equal(login.status, 200, 'HR test account must sign in');
  const cookie = login.headers.getSetCookie().map(value => value.split(';', 1)[0]).join('; ');
  const request = async (route, body) => {
    const response = await fetch(base + route, { method: body ? 'POST' : 'GET',
      headers: { Origin: base, Cookie: cookie, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined });
    return { response, data: response.headers.get('content-type')?.includes('json') ? await response.json() : null };
  };
  const policy = need(await service.from('work_policies')
    .select('effective_from,effective_to,start_time,lunch_start,lunch_end,end_time,working_weekdays')
    .lte('effective_from', `${month}-30`).or(`effective_to.is.null,effective_to.gte.${month}-01`)
    .order('effective_from', { ascending: false }).limit(1).single(), 'effective policy');
  assert(policy.effective_from <= `${month}-01` && (!policy.effective_to || policy.effective_to >= `${month}-30`),
    'one effective policy must cover the isolated month');
  const weekdays = policy.working_weekdays;
  const allDates = Array.from({ length: 28 }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`);
  const isoWeekday = date => { const day = new Date(`${date}T12:00:00Z`).getUTCDay(); return day === 0 ? 7 : day; };
  const working = allDates.filter(date => weekdays.includes(isoWeekday(date)));
  const rest = allDates.find(date => !weekdays.includes(isoWeekday(date)));
  assert(working.length >= 4 && rest, 'test policy needs work and rest weekdays');
  const [normal, holiday, incomplete, corrected] = working;
  const suffix = randomUUID().slice(0, 8);
  const code = `P6-API-${suffix}`;
  employeeId = need(await service.from('employees').insert({ employee_code: code,
    full_name: 'Phase 6 snapshot fixture', work_email: `phase6-api-${suffix}@example.invalid`, status: 'active' })
    .select('id').single(), 'create employee').id;
  periodId = need(await service.from('timesheet_periods').insert({ year: 2096, month: 6, status: 'open' })
    .select('id').single(), 'create period').id;
  const holidayRows = need(await service.from('holidays').insert([
    { holiday_date: holiday, name: 'Phase 6 nghỉ thử', is_working_override: false },
    { holiday_date: rest, name: 'Phase 6 làm bù thử', is_working_override: true },
  ]).select('id'), 'create holiday overrides');
  holidayIds.push(...holidayRows.map(row => row.id));
  const fullDates = [normal, holiday, rest];
  const events = fullDates.flatMap(date => [
    { employee_id: employeeId, work_date: date, kind: 'check_in', occurred_at: `${date}T${policy.start_time.slice(0, 8)}+07:00`,
      source: 'online', idempotency_key: randomUUID(), evidence_status: 'not_provided', review_status: 'reviewed' },
    { employee_id: employeeId, work_date: date, kind: 'check_out', occurred_at: `${date}T${policy.end_time.slice(0, 8)}+07:00`,
      source: 'online', idempotency_key: randomUUID(), evidence_status: 'not_provided', review_status: 'reviewed' },
  ]);
  events.push({ employee_id: employeeId, work_date: incomplete, kind: 'check_in',
    occurred_at: `${incomplete}T${policy.start_time.slice(0, 8)}+07:00`, source: 'online',
    idempotency_key: randomUUID(), evidence_status: 'not_provided', review_status: 'reviewed' });
  eventIds.push(...need(await service.from('attendance_events').insert(events).select('id'), 'create events').map(row => row.id));
  correctionIds.push(...need(await service.from('attendance_corrections').insert({ employee_id: employeeId,
    work_date: corrected, proposed_check_in: `${corrected}T${policy.start_time.slice(0, 8)}+07:00`,
    proposed_check_out: `${corrected}T${policy.end_time.slice(0, 8)}+07:00`,
    reason: 'Bổ sung hai mốc Phase 6', status: 'approved', reviewed_at: new Date().toISOString() })
    .select('id'), 'create approved correction').map(row => row.id));
  need(await service.from('employees').update({ status: 'inactive' }).eq('id', employeeId), 'deactivate historical employee');
  const recalc = await request(`/api/v1/hr/timesheet-periods/${periodId}/recalculate`, {});
  assert.equal(recalc.response.status, 200, `recalculate: ${recalc.data?.error?.code ?? recalc.response.status}`);
  const detail = await request(`/api/v1/hr/timesheet-periods/${periodId}`);
  assert.equal(detail.response.status, 200);
  const rows = new Map(detail.data.data.days.filter(row => row.employee_id === employeeId).map(row => [row.work_date, row]));
  const expected = (Number(policy.lunch_start.slice(0, 2)) * 60 + Number(policy.lunch_start.slice(3, 5)))
    - (Number(policy.start_time.slice(0, 2)) * 60 + Number(policy.start_time.slice(3, 5)))
    + (Number(policy.end_time.slice(0, 2)) * 60 + Number(policy.end_time.slice(3, 5)))
    - (Number(policy.lunch_end.slice(0, 2)) * 60 + Number(policy.lunch_end.slice(3, 5)));
  assert.equal(rows.get(normal)?.regular_minutes, expected, 'normal workday uses effective shift');
  assert.equal(rows.get(normal)?.overtime_minutes, 0, 'late checkout without approval is not overtime');
  assert.equal(rows.get(holiday)?.overtime_minutes, expected, 'holiday work is automatic overtime');
  assert.equal(rows.get(holiday)?.regular_minutes, 0);
  assert.equal(rows.get(holiday)?.overtime_kind, 'automatic_rest_day');
  const summary = await request('/api/v1/reports/summary?month=' + month + '&scope=all');
  assert.equal(summary.response.status, 200);
  assert(summary.data.data.days.some(day => day.id === rows.get(holiday).id && day.overtime_kind === 'automatic_rest_day'));
  assert.equal(rows.get(normal)?.overtime_kind, 'none');
  assert.equal(rows.get(rest)?.regular_minutes, expected, 'make-up workday uses shared shift');
  assert.equal(rows.get(rest)?.overtime_minutes, 0);
  assert.equal(rows.get(incomplete)?.regular_minutes, 0, 'missing checkout cannot create minutes');
  assert(rows.get(incomplete)?.exceptions?.includes('incomplete_attendance'));
  assert.equal(rows.get(corrected)?.regular_minutes, expected, 'approved correction supplies both missing punches');
  assert(!rows.get(corrected)?.exceptions?.includes('missing_attendance'));
  console.log('PASS HR snapshot: normal work, holiday overtime, make-up workday, incomplete punch, approved correction');
  const exported = await request(`/api/v1/reports/timesheet.xlsx?period_id=${periodId}`);
  assert.equal(exported.response.status, 200, 'Excel export is available');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(Buffer.from(await exported.response.arrayBuffer()));
  const sheet = workbook.getWorksheet('Bảng công');
  assert(sheet);
  const excelRows = new Map();
  sheet.eachRow(row => {
    if (row.getCell(1).value === code) excelRows.set(row.getCell(4).value, row);
  });
  for (const date of [normal, holiday, rest, incomplete, corrected]) {
    assert.equal(excelRows.get(date)?.getCell(5).value, rows.get(date).regular_minutes);
    assert.equal(excelRows.get(date)?.getCell(6).value, rows.get(date).overtime_minutes);
  }
  assert.equal(excelRows.get(holiday).getCell(15).value, '\u0054\u1ef1 \u0111\u1ed9ng ng\u00e0y ngh\u1ec9');
  console.log('PASS Excel minutes match the HR snapshot for every fixture day');
} catch (error) {
  console.error(`FAIL Phase 6 API: ${error.message}`);
  process.exitCode = 1;
} finally {
  // Cleanup leaves no employee, attendance, period, snapshot or audit fixture.
  if (periodId) {
    need(await service.from('timesheet_exception_reviews').delete().eq('period_id', periodId), 'remove reviews');
    need(await service.from('timesheet_days').delete().eq('period_id', periodId), 'remove snapshot');
    need(await service.from('audit_logs').delete().eq('entity_id', periodId), 'remove period audit');
  }
  if (correctionIds.length) need(await service.from('attendance_corrections').delete().in('id', correctionIds), 'remove corrections');
  if (eventIds.length) need(await service.from('attendance_events').delete().in('id', eventIds), 'remove events');
  if (holidayIds.length) need(await service.from('holidays').delete().in('id', holidayIds), 'remove holidays');
  if (periodId) need(await service.from('timesheet_periods').delete().eq('id', periodId), 'remove period');
  if (employeeId) need(await service.from('employees').delete().eq('id', employeeId), 'remove employee');
}
