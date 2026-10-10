#!/usr/bin/env node
// Read-only PostgreSQL catalog checks on the designated test project.
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  return match ? [[match[1], match[2].trim().replace(/^(["'])(.*)\1$/, '$2')]] : [];
}));
const ref = 'pkpwcpatuslfjyoivbuf';
if (env.NEXT_PUBLIC_SUPABASE_URL !== `https://${ref}.supabase.co` || !env.SUPABASE_TEST_DB_PASSWORD)
  throw new Error('Thiếu mật khẩu hoặc URL không khớp project test.');
const connection = { ...process.env, PGHOST: 'aws-0-ap-southeast-1.pooler.supabase.com', PGPORT: '5432',
  PGUSER: `postgres.${ref}`, PGDATABASE: 'postgres', PGPASSWORD: env.SUPABASE_TEST_DB_PASSWORD,
  PGSSLMODE: 'require', PGCONNECT_TIMEOUT: '10' };
function query(sql) {
  const result = spawnSync('psql', ['-X', '--no-password', '-At', '-v', 'ON_ERROR_STOP=1', '-c', sql],
    { env: connection, encoding: 'utf8', maxBuffer: 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`Không đọc được catalog (psql ${result.status ?? result.error?.code}).`);
  return result.stdout.trim();
}
let failures = 0;
function check(label, passed, detail = '') {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!passed) failures++;
}
const identity = query('select current_database(),current_user');
check('Đúng database và role test', identity === 'postgres|postgres');
const tables = query(`select json_agg(json_build_object('name',c.relname,'rls',c.relrowsecurity,
  'anon_select',has_table_privilege('anon',c.oid,'SELECT'),
  'anon_insert',has_table_privilege('anon',c.oid,'INSERT'),
  'anon_update',has_table_privilege('anon',c.oid,'UPDATE'),
  'anon_delete',has_table_privilege('anon',c.oid,'DELETE')) order by c.relname)
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind in ('r','p')`);
const rows = JSON.parse(tables);
const business = rows.filter(row => row.name !== 'app_schema_migrations');
check('RLS trên mọi bảng nghiệp vụ', business.every(row => row.rls), `${business.length} bảng`);
check('Anon không có quyền bảng public', rows.every(row =>
  !row.anon_select && !row.anon_insert && !row.anon_update && !row.anon_delete));
const blocked = ['attendance_events','attendance_photos','leave_ledger','timesheet_days',
  'timesheet_adjustments','audit_logs'];
const writes = query(`select coalesce(json_agg(c.relname order by c.relname),'[]'::json)
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relname = any(array['${blocked.join("','")}'])
  and (has_table_privilege('authenticated',c.oid,'INSERT')
    or has_table_privilege('authenticated',c.oid,'UPDATE')
    or has_table_privilege('authenticated',c.oid,'DELETE')
    or exists(select 1 from pg_attribute a where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
      and (has_column_privilege('authenticated',c.oid,a.attnum,'INSERT')
        or has_column_privilege('authenticated',c.oid,a.attnum,'UPDATE'))))`);
check('Không ghi trực tiếp event/ledger/snapshot/audit/điều chỉnh', JSON.parse(writes).length === 0,
  writes === '[]' ? '' : writes);
const storagePolicies = Number(query(`select count(*) from pg_policies where schemaname='storage'
  and tablename='objects' and policyname like 'attendance_photo_object_%'`));
check('Storage có policy đọc/ghi/xóa theo quyền', storagePolicies >= 5, `${storagePolicies} policy`);
process.exitCode = failures ? 1 : 0;
