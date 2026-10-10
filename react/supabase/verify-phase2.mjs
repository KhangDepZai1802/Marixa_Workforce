#!/usr/bin/env node
// Read-only checks for the hosted test project. This script never applies SQL,
// resets data, uploads files, or prints keys and tokens.
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(directory, '..', '.env.local');
let contents;
try {
  contents = readFileSync(envPath, 'utf8');
} catch {
  console.error('Thiếu react/.env.local. Hãy lưu file cấu hình test trước khi kiểm tra Phase 2.');
  process.exit(1);
}

const env = Object.fromEntries(contents.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)=(.*)$/);
  if (!match) return [];
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return [[match[1], value]];
}));

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secretKey = env.SUPABASE_SECRET_KEY;
if (!url || !publishableKey || !secretKey) {
  console.error('Thiếu URL, publishable key hoặc secret key trong react/.env.local.');
  process.exit(1);
}
let projectUrl;
try {
  projectUrl = new URL(url);
} catch {
  console.error('NEXT_PUBLIC_SUPABASE_URL không phải URL hợp lệ.');
  process.exit(1);
}
if (projectUrl.protocol !== 'https:' || projectUrl.hostname !== 'pkpwcpatuslfjyoivbuf.supabase.co') {
  console.error('Từ chối kiểm tra: URL không thuộc Supabase project test đã chốt.');
  process.exit(1);
}

const service = createClient(url, secretKey, { auth: { autoRefreshToken: false, persistSession: false } });
const anon = createClient(url, publishableKey, { auth: { autoRefreshToken: false, persistSession: false } });
let failures = 0;
function check(label, passed, detail = '') {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!passed) failures += 1;
}
function errorKind(error) {
  return error.status ?? error.code ?? error.name ?? 'network';
}

const migrationFiles = readdirSync(path.join(directory, 'migrations')).filter((name) => /^\d{12}_.*\.sql$/.test(name)).sort();
const expected = new Map(migrationFiles.map((name) => {
  const sql = readFileSync(path.join(directory, 'migrations', name), 'utf8').replace(/^\uFEFF/, '');
  return [name, createHash('sha256').update(sql).digest('hex').slice(0, 16)];
}));
try {
  const { data, error } = await service.from('app_schema_migrations').select('version,checksum');
  if (error) throw error;
  const applied = new Map(data.map((row) => [row.version, row.checksum]));
  const missing = [...expected].filter(([name, checksum]) => applied.get(name) !== checksum);
  const unexpected = [...applied.keys()].filter((name) => !expected.has(name));
  check('Migration version/checksum', missing.length === 0 && unexpected.length === 0,
    `${expected.size} file, ${applied.size} version; lệch ${missing.length}, ngoài danh sách ${unexpected.length}`);
} catch (error) {
  check('Migration version/checksum', false, `không đọc được lịch sử (${errorKind(error)})`);
}

try {
  const { data, error } = await service.storage.getBucket('attendance-photos');
  if (error) throw error;
  const types = new Set(data.allowed_mime_types ?? []);
  const mimeOk = ['image/jpeg', 'image/png', 'image/webp'].every((type) => types.has(type));
  check('Storage bucket private + MIME', data.public === false && mimeOk,
    `private=${data.public === false}, MIME cần thiết=${mimeOk}, giới hạn=${data.file_size_limit ?? 'chưa đặt'} byte`);
} catch (error) {
  check('Storage bucket private + MIME', false, `không đọc được bucket (${errorKind(error)})`);
}

try {
  const { data, error, status } = await anon.from('employees').select('id').limit(1);
  const denied = status === 401 || status === 403 || error?.code === '42501';
  check('Anon không đọc hồ sơ', denied || (status === 200 && !error && data.length === 0),
    `HTTP ${status}`);
} catch {
  check('Anon không đọc hồ sơ', false, 'lỗi kết nối');
}

try {
  const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: publishableKey } });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const settings = await response.json();
  const emailEnabled = settings.external?.email === true;
  const signupDisabled = settings.disable_signup === true;
  check('Auth email/password + tắt signup', emailEnabled && signupDisabled,
    `email=${emailEnabled}, signup tắt=${signupDisabled}`);
} catch (error) {
  check('Auth email/password + tắt signup', false, `không đọc được Auth settings (${error.message})`);
}

process.exitCode = failures ? 1 : 0;
