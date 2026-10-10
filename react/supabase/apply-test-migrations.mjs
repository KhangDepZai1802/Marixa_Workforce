#!/usr/bin/env node
// Apply only missing versioned migrations to the designated disposable test DB.
// Password comes from ignored .env.local and is passed to psql via environment.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(directory, '..', '.env.local');
let content;
try {
  content = readFileSync(envPath, 'utf8');
} catch {
  console.error('Thiếu react/.env.local.');
  process.exit(1);
}
const env = Object.fromEntries(content.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)$/);
  if (!match) return [];
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  return [[match[1], value]];
}));
if (env.NEXT_PUBLIC_SUPABASE_URL !== 'https://pkpwcpatuslfjyoivbuf.supabase.co') {
  console.error('Từ chối áp migration: URL không phải project test đã xác minh.');
  process.exit(1);
}
if (!env.SUPABASE_TEST_DB_PASSWORD) {
  console.error('Thiếu SUPABASE_TEST_DB_PASSWORD trong react/.env.local.');
  process.exit(1);
}
const pgEnv = {
  ...process.env,
  PGHOST: 'aws-0-ap-southeast-1.pooler.supabase.com',
  PGPORT: '5432',
  PGUSER: 'postgres.pkpwcpatuslfjyoivbuf',
  PGDATABASE: 'postgres',
  PGPASSWORD: env.SUPABASE_TEST_DB_PASSWORD,
  PGSSLMODE: 'require',
  PGCONNECT_TIMEOUT: '10',
};
function psql(args) {
  const result = spawnSync('psql', ['-X', '--no-password', '-v', 'ON_ERROR_STOP=1', ...args], {
    env: pgEnv, encoding: 'utf8', maxBuffer: 1024 * 1024,
  });
  if (result.error) throw new Error(`Không chạy được psql (${result.error.code ?? 'process'}).`);
  if (result.status !== 0) {
    // Report a category without echoing a connection string or SQL data.
    const detail = result.stderr ?? '';
    const category = /password authentication failed|FATAL:.*password/i.test(detail) ? 'sai mật khẩu database'
      : /could not translate host|Name or service not known/i.test(detail) ? 'không tìm được host'
      : /timed out|timeout/i.test(detail) ? 'kết nối quá thời gian'
      : /SSL|certificate/i.test(detail) ? 'lỗi SSL'
      : /no pg_hba.conf|authentication/i.test(detail) ? 'lỗi xác thực DB'
      : /connection refused|could not connect/i.test(detail) ? 'không kết nối được DB'
      : /ERROR:/i.test(detail) ? 'lỗi SQL'
      : 'lỗi psql khác';
    throw new Error(`${category} (psql ${result.status}).`);
  }
  return result.stdout.trim();
}
try {
  const identity = psql(['-At', '-c', "select current_database(), current_user"]);
  if (!identity.startsWith('postgres|postgres')) throw new Error('Kết nối DB không khớp vai trò mong đợi.');
  const historyExists = psql(['-At', '-c', "select to_regclass('public.app_schema_migrations') is not null"]); 
  let applied = new Map();
  if (historyExists === 't') {
    const rows = psql(['-At', '-F', '|', '-c', 'select version, checksum from public.app_schema_migrations order by version']);
    applied = new Map(rows ? rows.split(/\r?\n/).map((row) => row.split('|')) : []);
  } else {
    const tableCount = Number(psql(['-At', '-c', "select count(*) from information_schema.tables where table_schema='public' and table_type='BASE TABLE'"]));
    if (!Number.isInteger(tableCount) || tableCount !== 0) throw new Error('Schema public đã có bảng nhưng chưa có lịch sử migration; cần đối chiếu thủ công.');
  }
  const files = readdirSync(path.join(directory, 'migrations'))
    .filter((name) => /^\d{12}_[A-Za-z0-9_]+\.sql$/.test(name)).sort();
  if (files.length === 0) throw new Error('Không có migration SQL.');
  for (const name of files) {
    const file = path.join(directory, 'migrations', name);
    const sql = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
    const checksum = createHash('sha256').update(sql).digest('hex').slice(0, 16);
    if (applied.has(name)) {
      if (applied.get(name) !== checksum) throw new Error(`Checksum đã đổi sau khi áp: ${name}`);
      console.log(`SKIP ${name} (đã áp, checksum đúng)`);
      continue;
    }
    psql(['-q', '--single-transaction', '-f', file, '-c',
      `insert into public.app_schema_migrations(version,checksum) values ('${name}','${checksum}')`]);
    console.log(`APPLIED ${name}`);
  }
  console.log('Đã áp/đối chiếu xong migration. Chưa seed dữ liệu hoặc tạo Auth user.');
} catch (error) {
  console.error(`Dừng migration: ${error.message}`);
  process.exitCode = 1;
}
