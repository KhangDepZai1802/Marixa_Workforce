#!/usr/bin/env node
// Test only; all fixture rows and state changes roll back together.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  .split(/\r?\n/).flatMap(line => {
    const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)$/);
    if (!match) return [];
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [[match[1], value]];
  }));
if (env.NEXT_PUBLIC_SUPABASE_URL !== 'https://pkpwcpatuslfjyoivbuf.supabase.co' || !env.SUPABASE_TEST_DB_PASSWORD)
  throw new Error('Only the designated Supabase test project is allowed.');
const db = new Client({ host: 'aws-0-ap-southeast-1.pooler.supabase.com', port: 5432,
  user: 'postgres.pkpwcpatuslfjyoivbuf', database: 'postgres', password: env.SUPABASE_TEST_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
const one = async (sql, args = []) => (await db.query(sql, args)).rows[0];
const actor = async id => one("select set_config('request.jwt.claim.sub',$1,true)", [id]);
const balance = async (employeeId, year) => Number((await one(
  'select coalesce(sum(amount_days),0) as total from public.leave_ledger where employee_id=$1 and year=$2',
  [employeeId, year])).total);
async function rejectsAtSavepoint(label, action, code) {
  await db.query('savepoint phase6_expected_error');
  try { await action(); throw new Error(`Expected rejection: ${label}`); }
  catch (error) { assert.equal(error.code, code, label); }
  finally { await db.query('rollback to savepoint phase6_expected_error'); }
}
let started = false;
try {
  await db.connect();
  await db.query('begin'); started = true;
  const hr = await one("select id,auth_user_id,employee_id from public.app_users where role='hr' and status='active' and must_change_password=false and employee_id is not null limit 1");
  const admin = await one("select id,auth_user_id,employee_id from public.app_users where role='admin' and status='active' and must_change_password=false limit 1");
  const employee = await one("select id,auth_user_id,employee_id from public.app_users where role='employee' and status='active' and must_change_password=false and employee_id is not null limit 1");
  assert(hr && admin && employee, 'test HR/admin/employee accounts are required');
  await actor(hr.auth_user_id);

  const suffix = Math.random().toString(36).slice(2, 10);
  const hire = await one('insert into public.employees(employee_code,full_name,work_email,hire_date) values($1,$2,$3,$4) returning id',
    [`P6-${suffix}`, 'Phase 6 accrual fixture', `phase6-${suffix}@example.invalid`, '2082-03-19']);
  const firstAccrual = await one("select public.accrue_monthly_annual_leave('2082-12-01') as count");
  const secondAccrual = await one("select public.accrue_monthly_annual_leave('2082-12-01') as count");
  assert(firstAccrual.count >= 10, 'March through December should accrue');
  assert.equal(secondAccrual.count, 0, 'monthly accrual is idempotent');
  assert.equal(await balance(hire.id, 2082), 10);
  const nextYear = await one("select public.accrue_monthly_annual_leave('2083-12-01') as count");
  assert(nextYear.count >= 12);
  assert.equal(await balance(hire.id, 2083), 12, 'annual policy grants at most twelve monthly days');
  console.log('PASS monthly leave: hire month, twelve-day year, retry without duplicate');

  const type = await one("select id from public.leave_types where deducts_annual_balance=true and active=true limit 1");
  assert(type, 'active annual leave type is required');
  // Existing test employee is touched only within this rollback transaction.
  await one("insert into public.leave_ledger(employee_id,year,amount_days,entry_type,reason,created_by) values($1,2083,2,'carryover','Kiểm thử Phase 6', $2)", [employee.employee_id, hr.id]);
  await one("insert into public.leave_ledger(employee_id,year,amount_days,entry_type,reason,created_by) values($1,2084,2,'carryover','Kiểm thử Phase 6', $2)", [employee.employee_id, hr.id]);
  const request = await one(`insert into public.leave_requests(employee_id,leave_type_id,start_date,end_date,day_parts,total_days,reason,status)
    values($1,$2,'2083-12-30','2084-01-02',$3::jsonb,1,'Kiểm thử qua năm','pending') returning id`,
    [employee.employee_id, type.id, JSON.stringify([{ date: '2083-12-30', part: 'morning' }, { date: '2084-01-02', part: 'afternoon' }])]);
  await rejectsAtSavepoint('no self approval', () => actor(employee.auth_user_id).then(() => one(
    "select id from public.decide_leave_request($1,'approved','Kiểm thử')", [request.id])), '42501');
  await actor(hr.auth_user_id);
  await one("select id from public.decide_leave_request($1,'approved','Duyệt dữ liệu giả')", [request.id]);
  const debits = (await db.query("select year,amount_days from public.leave_ledger where leave_request_id=$1 and entry_type='deduction' order by year", [request.id])).rows;
  assert.deepEqual(debits.map(d => [d.year, Number(d.amount_days)]), [[2083, -0.5], [2084, -0.5]]);
  await rejectsAtSavepoint('no repeated approval', () => one("select id from public.decide_leave_request($1,'approved','Thử lặp')", [request.id]), '40001');
  await actor(employee.auth_user_id);
  await one("select id from public.cancel_leave_request($1,'Hủy dữ liệu giả')", [request.id]);
  const reversals = (await db.query("select year,amount_days from public.leave_ledger where leave_request_id=$1 and entry_type='reversal' order by year", [request.id])).rows;
  assert.deepEqual(reversals.map(d => [d.year, Number(d.amount_days)]), [[2083, 0.5], [2084, 0.5]]);
  await rejectsAtSavepoint('no repeated cancellation', () => one("select id from public.cancel_leave_request($1,'Thử lặp')", [request.id]), '40001');
  console.log('PASS annual leave: half days across years, roles, single debit and reversal');

  await actor(hr.auth_user_id);
  const tooMuch = await one(`insert into public.leave_requests(employee_id,leave_type_id,start_date,end_date,day_parts,total_days,reason,status)
    values($1,$2,'2083-07-01','2083-07-03',$3::jsonb,3,'Kiểm thử vượt số dư','pending') returning id`,
    [employee.employee_id, type.id, JSON.stringify(['01', '02', '03'].map(day => ({ date: `2083-07-${day}`, part: 'full' })))]);
  await rejectsAtSavepoint('insufficient balance', () => one(
    "select id from public.decide_leave_request($1,'approved','Thử vượt số dư')", [tooMuch.id]), '23514');
  assert.equal((await one('select status from public.leave_requests where id=$1', [tooMuch.id])).status, 'pending');
  console.log('PASS annual leave: insufficient balance leaves request and ledger unchanged');

  const overtime = async (employeeId, date) => one(`insert into public.overtime_requests(employee_id,work_date,start_at,end_at,reason,status)
    values($1,$2,$3,$4,'Kiểm thử duyệt tăng ca','pending') returning id`,
    [employeeId, date, `${date}T17:00:00+07:00`, `${date}T18:00:00+07:00`]);
  const employeeOvertime = await overtime(employee.employee_id, '2083-06-15');
  assert.equal((await one("select status from public.decide_overtime_request($1,'approved','HR duyệt')", [employeeOvertime.id])).status, 'approved');
  await rejectsAtSavepoint('no repeated overtime approval', () => one(
    "select id from public.decide_overtime_request($1,'approved','Thử lặp')", [employeeOvertime.id]), '40001');
  const hrOvertime = await overtime(hr.employee_id, '2083-06-16');
  await rejectsAtSavepoint('HR cannot self approve', () => one(
    "select id from public.decide_overtime_request($1,'approved','Tự duyệt')", [hrOvertime.id]), '42501');
  await actor(admin.auth_user_id);
  assert.equal((await one("select status from public.decide_overtime_request($1,'approved','Admin duyệt')", [hrOvertime.id])).status, 'approved');
  const adminEmployeeId = admin.employee_id ?? hire.id;
  if (!admin.employee_id) await one('update public.app_users set employee_id=$1 where id=$2', [adminEmployeeId, admin.id]);
  const adminOvertime = await overtime(adminEmployeeId, '2083-06-17');
  await rejectsAtSavepoint('admin cannot self approve', () => one(
    "select id from public.decide_overtime_request($1,'approved','Tự duyệt')", [adminOvertime.id]), '42501');
  await actor(hr.auth_user_id);
  assert.equal((await one("select status from public.decide_overtime_request($1,'approved','HR duyệt admin')", [adminOvertime.id])).status, 'approved');
  console.log('PASS overtime roles: employee→HR, HR→admin, admin→HR, no self approval');

  const period = await one("insert into public.timesheet_periods(year,month,status,version) values(2083,4,'open',1) returning id");
  const day = await one(`insert into public.timesheet_days(period_id,employee_id,work_date,regular_minutes,overtime_minutes,source_revision,snapshot_version,exceptions)
    values($1,$2,'2083-04-15',480,0,'phase6',1,'["photo_pending","missing_attendance"]') returning id`,
    [period.id, employee.employee_id]);
  await rejectsAtSavepoint('business exception needs review', () => one('select id from public.review_timesheet_period($1)', [period.id]), '23514');
  await one("select id from public.acknowledge_timesheet_exception($1,'missing_attendance','Đã đối soát dữ liệu giả')", [day.id]);
  const pending = await one(`insert into public.attendance_corrections(employee_id,work_date,proposed_check_in,reason,status)
    values($1,'2083-04-16','2083-04-16T08:00:00+07:00','Kiểm thử chờ duyệt','pending') returning id`, [employee.employee_id]);
  await rejectsAtSavepoint('pending request blocks review', () => one('select id from public.review_timesheet_period($1)', [period.id]), '23514');
  await one("update public.attendance_corrections set status='rejected' where id=$1", [pending.id]);
  const reviewed = await one('select status from public.review_timesheet_period($1)', [period.id]);
  assert.equal(reviewed.status, 'hr_reviewed', 'missing photo does not block review');
  await actor(admin.auth_user_id);
  const locked = await one('select status,version from public.lock_timesheet_period($1)', [period.id]);
  assert.deepEqual(locked, { status: 'locked', version: 1 });
  await rejectsAtSavepoint('unlock requires reason', () => one("select id from public.unlock_timesheet_period($1,'')", [period.id]), '22023');
  const reopened = await one("select status,version from public.unlock_timesheet_period($1,'Dữ liệu giả cần đối soát')", [period.id]);
  assert.deepEqual(reopened, { status: 'open', version: 2 });
  const frozen = await one('select regular_minutes,snapshot_version from public.timesheet_days where id=$1', [day.id]);
  assert.deepEqual(frozen, { regular_minutes: 480, snapshot_version: 1 });
  console.log('PASS timesheet: exception, pending request, informational photo, review, lock, audited reopen/version');

  const lockedMay = await one("insert into public.timesheet_periods(year,month,status,version) values(2083,5,'locked',1) returning id");
  const crossing = await one(`insert into public.leave_requests(employee_id,leave_type_id,start_date,end_date,day_parts,total_days,reason,status)
    values($1,$2,'2083-04-30','2083-05-01',$3::jsonb,1,'Kiểm thử qua tháng','pending') returning id`,
    [employee.employee_id, type.id, JSON.stringify([{ date: '2083-04-30', part: 'morning' }, { date: '2083-05-01', part: 'afternoon' }])]);
  await actor(hr.auth_user_id);
  await rejectsAtSavepoint('leave cannot change locked second month', () => one(
    "select id from public.decide_leave_request($1,'approved','Thử kỳ khóa')", [crossing.id]), '55000');
  assert.equal((await one('select status from public.leave_requests where id=$1', [crossing.id])).status, 'pending');
  assert(lockedMay.id);
  console.log('PASS cross-month locked snapshot remains unchanged');
} catch (error) {
  console.error(`FAIL Phase 6 DB: ${error.code ?? error.name} ${error.message}`);
  process.exitCode = 1;
} finally {
  if (started) await db.query('rollback').catch(() => {});
  await db.end().catch(() => {});
}
