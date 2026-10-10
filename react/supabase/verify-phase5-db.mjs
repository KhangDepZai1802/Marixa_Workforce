#!/usr/bin/env node
// Transactional fixtures on the designated test project. Every fixture rolls back.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
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
  throw new Error('Thiếu cấu hình project test đã xác minh.');
const client = new Client({ host: 'aws-0-ap-southeast-1.pooler.supabase.com', port: 5432,
  user: 'postgres.pkpwcpatuslfjyoivbuf', database: 'postgres', password: env.SUPABASE_TEST_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });
const one = async (sql, values = []) => (await client.query(sql, values)).rows[0];
const review = async (actor, id, decision, regular, overtime, expectedRegular, expectedOvertime) => one(
  'select r.* from public.review_late_attendance_adjustment($1,$2,$3,$4,$5,$6,$7,$8) r',
  [actor, id, decision, regular, overtime, expectedRegular, expectedOvertime, 'Đối soát dữ liệu giả Phase 5']);
let started = false;
try {
  await client.connect();
  await client.query('begin'); started = true;
  const actor = await one("select id,auth_user_id from public.app_users where role='hr' and status='active' and must_change_password=false limit 1");
  assert(actor, 'test HR account missing');
  await one("select set_config('request.jwt.claim.sub',$1,true)", [actor.auth_user_id]);
  const suffix = randomUUID().slice(0, 8);
  const employee = await one('insert into public.employees(employee_code,full_name,work_email) values($1,$2,$3) returning id',
    [`PH5-${suffix}`, 'Phase 5 fixture', `phase5-${suffix}@example.invalid`]);
  const source = await one("insert into public.timesheet_periods(year,month,status,version) values(2020,1,'locked',1) returning id");
  const target = await one("insert into public.timesheet_periods(year,month,status,version) values(2098,2,'open',1) returning id");
  const sourceDay = await one("insert into public.timesheet_days(period_id,employee_id,work_date,regular_minutes,overtime_minutes,source_revision,snapshot_version) values($1,$2,'2020-01-15',0,0,'phase5',1) returning id",
    [source.id, employee.id]);
  const insertEvent = async (kind, date, time) => one(
    "insert into public.attendance_events(employee_id,work_date,kind,occurred_at,device_occurred_at,source,idempotency_key,review_status,evidence_status) values($1,$2,$3,$4,$4,'offline',$5,'needs_review','not_provided') returning id,received_at",
    [employee.id, date, kind, `${date}T${time}+07:00`, randomUUID()]);
  const first = await insertEvent('check_in', '2020-01-15', '08:00:00');
  const second = await insertEvent('check_out', '2020-01-15', '17:00:00');
  const proposals = (await client.query('select id,source_event_id,target_period_id from public.timesheet_adjustments where source_event_id=any($1::uuid[])', [[first.id, second.id]])).rows;
  assert.equal(proposals.length, 2, 'each late event gets one proposal');
  assert.equal(new Date(first.received_at).getUTCFullYear(), new Date().getUTCFullYear(), 'received_at uses server clock');
  await client.query('update public.timesheet_adjustments set target_period_id=$1 where source_event_id=any($2::uuid[])', [target.id, [first.id, second.id]]);
  const firstProposal = proposals.find(row => row.source_event_id === first.id);
  const secondProposal = proposals.find(row => row.source_event_id === second.id);
  const approved = await review(actor.auth_user_id, firstProposal.id, 'approved', 480, 0, 480, 0);
  assert.equal(approved.regular_minutes_delta, 480);
  await client.query('savepoint duplicate_approval');
  await assert.rejects(review(actor.auth_user_id, secondProposal.id, 'approved', 480, 0, 480, 0), error => error.code === '40001');
  await client.query('rollback to savepoint duplicate_approval');
  const zero = await review(actor.auth_user_id, secondProposal.id, 'approved', 0, 0, 480, 0);
  assert.equal(zero.regular_minutes_delta, 0, 'second event cannot pay twice');
  const frozen = await one('select regular_minutes,overtime_minutes from public.timesheet_days where id=$1', [sourceDay.id]);
  assert.deepEqual(frozen, { regular_minutes: 0, overtime_minutes: 0 }, 'locked snapshot remains unchanged');
  await client.query("insert into public.timesheet_days(period_id,employee_id,work_date,regular_minutes,overtime_minutes,source_revision,snapshot_version) values($1,$2,'2020-01-16',480,0,'phase5-corrected',1)", [source.id, employee.id]);
  const corrected = await insertEvent('check_in', '2020-01-16', '08:00:00');
  const correctedProposal = await one('select id from public.timesheet_adjustments where source_event_id=$1', [corrected.id]);
  const compensated = await review(actor.auth_user_id, correctedProposal.id, 'approved', 0, 0, 480, 0);
  assert.equal(compensated.regular_minutes_delta, 0, 'already corrected snapshot has no extra payment');
  const open = await one("insert into public.timesheet_periods(year,month,status) values(2098,3,'open') returning id");
  await insertEvent('check_in', '2098-03-15', '08:00:00');
  const openCount = await one("select count(*)::int as count from public.timesheet_adjustments a join public.attendance_events e on e.id=a.source_event_id where e.employee_id=$1 and e.work_date='2098-03-15'", [employee.id]);
  assert.equal(openCount.count, 0, 'open source period needs no prior-period adjustment');
  await client.query("update public.timesheet_periods set status='locked' where id=$1", [target.id]);
  await client.query("insert into public.timesheet_days(period_id,employee_id,work_date,regular_minutes,overtime_minutes,source_revision,snapshot_version) values($1,$2,'2020-01-17',0,0,'phase5-target-moved',1)", [source.id, employee.id]);
  const movedEvent = await insertEvent('check_in', '2020-01-17', '08:00:00');
  const movedProposal = await one('select id from public.timesheet_adjustments where source_event_id=$1', [movedEvent.id]);
  await client.query('update public.timesheet_adjustments set target_period_id=$1 where id=$2', [target.id, movedProposal.id]);
  const moved = await review(actor.auth_user_id, movedProposal.id, 'approved', 0, 0, 0, 0);
  assert.notEqual(moved.target_period_id, target.id, 'closed target gets replaced');
  const movedPeriod = await one('select status from public.timesheet_periods where id=$1', [moved.target_period_id]);
  assert.equal(movedPeriod.status, 'open');
  assert(open.id);
  console.log('PASS: late events, server receipt, repeated approval guard, already compensated day, open source, closed target, immutable snapshot');
} catch (error) {
  console.error(`FAIL: ${error.code ?? error.name ?? 'verification'} ${error.message}`);
  process.exitCode = 1;
} finally {
  if (started) await client.query('rollback').catch(() => {});
  await client.end().catch(() => {});
}
