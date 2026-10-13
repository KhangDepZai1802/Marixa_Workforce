// Isolated PostgreSQL regression; never reads .env.local or connects to Supabase.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const bin = process.env.PG_BIN || 'C:/Program Files/PostgreSQL/18/bin';
const root = path.resolve('.artifacts/evidence-sql');
mkdirSync(root, { recursive: true });
const cluster = mkdtempSync(path.join(root, 'cluster-'));
const port = 55439;
function run(tool, args) {
  const result = spawnSync(path.join(bin, tool + (process.platform === 'win32' ? '.exe' : '')), args,
    { windowsHide: true, stdio: 'ignore', timeout: 60000 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout);
}
const sql = name => readFileSync(path.join('supabase/migrations', name), 'utf8').replaceAll('\r\n', '\n');
let started = false;
const client = new pg.Client({ host: '127.0.0.1', port, user: 'postgres', database: 'postgres' });
try {
  run('initdb', ['-D', cluster, '-U', 'postgres', '-A', 'trust', '--no-locale', '-E', 'UTF8']);
  run('pg_ctl', ['-D', cluster, '-l', path.join(cluster, 'server.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', 'start']);
  started = true;
  await client.connect();
  await client.query(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;`);
  const initial = sql('202610090001_initial_workforce.sql');
  await client.query(initial.slice(0, initial.indexOf('create table public.attendance_photos')));
  const optional = sql('202610090012_optional_evidence_and_leave_accrual.sql');
  await client.query(optional.slice(optional.indexOf('alter table public.attendance_events'), optional.indexOf('alter table public.attendance_photos')));
  const rpcStart = optional.indexOf('create function public.create_attendance_event(');
  const rpcEnd = optional.indexOf('\n\n', optional.indexOf('grant execute on function public.create_attendance_event', rpcStart));
  await client.query(optional.slice(rpcStart, rpcEnd));
  const user = randomUUID(), employee = randomUUID();
  await client.query('insert into auth.users values ($1)', [user]);
  await client.query("insert into employees(id,employee_code,full_name,work_email) values ($1,'TEST','Fixture','test@example.invalid')", [employee]);
  await client.query('insert into app_users(auth_user_id,employee_id,must_change_password) values ($1,$2,false)', [user, employee]);
  await client.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
  const call = async ({ key = randomUUID(), kind = 'check_in', date = '2026-10-13T01:00:00Z', lat = 10.77, lon = 106.69, accuracy = 10, photo = true } = {}) =>
    (await client.query("select * from create_attendance_event($1,'offline',$2,$3,$4,$5,$6,$7)", [kind, date, key, lat, lon, accuracy, photo])).rows[0];
  const oldKey = randomUUID();
  const old = await call({ key: oldKey, date: '2026-10-12T01:00:00Z', lat: null, lon: null, accuracy: null, photo: false });
  await client.query(sql('202610130020_required_attendance_evidence.sql'));
  await client.query('set role authenticated');
  for (const evidence of [{ photo: false }, { photo: null }, { lat: null }, { lat: null, lon: null, accuracy: null }, { lat: 91 }, { accuracy: 0 }, { accuracy: 10001 }]) {
    await assert.rejects(call(evidence), { code: '22023' });
  }
  assert.equal((await call({ key: oldKey, lat: null, lon: null, accuracy: null, photo: false })).id, old.id);
  const key = randomUUID();
  const created = await call({ key });
  assert.equal(created.evidence_status, 'pending');
  assert.equal(created.latitude, 10.77);
  assert.equal(created.location_flag, 'unknown', 'No office configuration does not block attendance');
  assert.equal((await call({ key, lat: null, lon: null, accuracy: null, photo: false })).id, created.id);
  await assert.rejects(call(), { code: '23505' });
  await assert.rejects(call({ kind: 'check_out', date: null }), { code: '22023' });
  await client.query('reset role');
  await client.query("insert into office_locations(name,latitude,longitude,radius_m) values ('Fixture',21,105,100)");
  await client.query('set role authenticated');
  const checkout = await call({ kind: 'check_out' });
  assert.equal(checkout.location_flag, 'outside', 'Outside office still accepted');
  await client.query('reset role');
  await client.query("update employees set status='inactive' where id=$1", [employee]);
  await client.query('set role authenticated');
  await assert.rejects(call({ key }), { code: '42501' });
  await client.query('reset role');
  await client.query('set role anon');
  await assert.rejects(call(), { code: '42501' });
  console.log('PASS isolated PostgreSQL: required photo/GPS, invalid evidence, historical replay, pending photo, duplicate, offline timestamp, missing office, outside office, inactive employee, anon denied');
} finally {
  await client.end().catch(() => {});
  if (started) run('pg_ctl', ['-D', cluster, '-m', 'fast', '-w', 'stop']);
}
