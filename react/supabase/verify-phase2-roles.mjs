#!/usr/bin/env node
// Access matrix against synthetic Phase 2 users. No credentials or tokens are logged.
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  return match ? [[match[1], match[2].trim().replace(/^(["'])(.*)\1$/, '$2')]] : [];
}));
const credentials = JSON.parse(readFileSync(path.join(root, '.env.phase2.local'), 'utf8'));
const ref = 'pkpwcpatuslfjyoivbuf';
if (env.NEXT_PUBLIC_SUPABASE_URL !== `https://${ref}.supabase.co` || credentials.ref !== ref)
  throw new Error('URL hoặc file tài khoản không khớp project test.');
const specs = [
  { code: 'TEST-P2-A', email: 'test-p2-a@example.com', role: 'employee' },
  { code: 'TEST-P2-B', email: 'test-p2-b@example.com', role: 'employee' },
  { code: 'TEST-P2-HR', email: 'test-p2-hr@example.com', role: 'hr' },
  { code: 'TEST-P2-ADMIN', email: 'test-p2-admin@example.com', role: 'admin' },
];
const makeClient = key => createClient(env.NEXT_PUBLIC_SUPABASE_URL, key,
  { auth: { autoRefreshToken: false, persistSession: false } });
const service = makeClient(env.SUPABASE_SECRET_KEY);
const clients = new Map();
let failures = 0;
function check(label, passed, detail = '') {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!passed) failures++;
}

for (const spec of specs) {
  const client = makeClient(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const { data, error } = await client.auth.signInWithPassword({ email: spec.email,
    password: credentials.passwords[spec.code] });
  check(`Đăng nhập ${spec.code}`, !error && !!data?.user);
  if (!error && data?.user) clients.set(spec.code, { client, id: data.user.id });
}
if (clients.size !== specs.length) process.exit(1);

for (const spec of specs) {
  const { client, id } = clients.get(spec.code);
  const [employees, accounts, audit] = await Promise.all([
    client.from('employees').select('employee_code'),
    client.from('app_users').select('auth_user_id,role'),
    client.from('audit_logs').select('id').eq('action', 'phase2_test_fixture'),
  ]);
  const codes = new Set((employees.data ?? []).map(row => row.employee_code));
  const expectedCodes = spec.role === 'employee' ? [spec.code] : specs.map(row => row.code);
  check(`${spec.code}: hồ sơ đúng phạm vi`, !employees.error && expectedCodes.length === codes.size &&
    expectedCodes.every(code => codes.has(code)), `${codes.size} hồ sơ, lỗi ${employees.error?.code ?? 'không'}`);
  const expectedAccounts = spec.role === 'admin' ? specs.length : 1;
  check(`${spec.code}: tài khoản đúng phạm vi`, !accounts.error && accounts.data?.length === expectedAccounts &&
    (spec.role === 'admin' || accounts.data?.[0]?.auth_user_id === id), `${accounts.data?.length ?? 0} tài khoản, role=${accounts.data?.map(row => row.role).join(',') ?? 'không'}`);
  check(`${spec.code}: chỉ admin đọc audit`, !audit.error &&
    (spec.role === 'admin' ? audit.data?.length === 1 : (audit.data?.length ?? 0) === 0),
    `${audit.data?.length ?? 0} bản ghi`);
}

// A real, nonempty PNG test object is removed in finally; it is never linked to an attendance event.
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YhJ2ioAAAAASUVORK5CYII=', 'base64'));
const aId = (await service.from('employees').select('id').eq('employee_code', 'TEST-P2-A').single()).data?.id;
const bId = (await service.from('employees').select('id').eq('employee_code', 'TEST-P2-B').single()).data?.id;
if (!aId || !bId) throw new Error('Không tìm thấy nhân viên test.');
const ownA = `${aId}/phase2-test-${randomUUID()}.png`;
const ownB = `${bId}/phase2-test-${randomUUID()}.png`;
const otherA = `${bId}/phase2-denied-${randomUUID()}.png`;
const anonPath = `${aId}/phase2-anon-${randomUUID()}.png`;
try {
  const aUpload = await clients.get('TEST-P2-A').client.storage.from('attendance-photos').upload(ownA, png, { contentType: 'image/png' });
  const bUpload = await clients.get('TEST-P2-B').client.storage.from('attendance-photos').upload(ownB, png, { contentType: 'image/png' });
  check('Storage: A/B ghi đúng thư mục', !aUpload.error && !bUpload.error);
  const wrong = await clients.get('TEST-P2-A').client.storage.from('attendance-photos').upload(otherA, png, { contentType: 'image/png' });
  check('Storage: A bị chặn ghi thư mục B', !!wrong.error);
  const anonymous = await makeClient(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).storage.from('attendance-photos')
    .upload(anonPath, png, { contentType: 'image/png' });
  check('Storage: anon bị chặn upload', !!anonymous.error);
  const aDeleteB = await clients.get('TEST-P2-A').client.storage.from('attendance-photos').remove([ownB]);
  check('Storage: A không xóa ảnh B', !!aDeleteB.error || !aDeleteB.data?.some(row => row.name === ownB));
} finally {
  const cleanup = await service.storage.from('attendance-photos').remove([ownA, ownB, otherA, anonPath]);
  check('Dọn ảnh kiểm thử', !cleanup.error);
}
process.exitCode = failures ? 1 : 0;
