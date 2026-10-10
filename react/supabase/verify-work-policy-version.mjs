#!/usr/bin/env node
// Reversible shared-shift version test against the designated Supabase test project.
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
  throw new Error('Only the designated Supabase test project is allowed.');
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } });
const base = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
if (!['http://localhost:3000','http://localhost:3001'].includes(base)) throw new Error('Local test server only.');
let failures = 0;
function check(label, passed, detail = '') {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`);
  if (!passed) failures++;
}
async function request(route, cookie = '', options = {}) {
  const response = await fetch(base + route, { ...options, redirect: 'manual', headers: {
    Origin: base, ...(cookie ? { Cookie: cookie } : {}),
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
  } });
  return { status: response.status, cookies: response.headers.getSetCookie()
    .map(value => value.split(';', 1)[0]).join('; '), body: await response.json().catch(() => null) };
}
async function login(code, phone) {
  return request('/api/v1/auth/login', '', { method: 'POST',
    body: JSON.stringify({ phone, password: credentials.passwords[code] }) });
}
const existing = await service.from('work_policies').select('id,effective_from,effective_to')
  .order('effective_from', { ascending: false }).limit(1).single();
if (existing.error || !existing.data) throw new Error('Test project has no shared shift to version.');
const previous = existing.data;
const nextDateValue = new Date(`${previous.effective_to ?? previous.effective_from}T00:00:00Z`);
nextDateValue.setUTCDate(nextDateValue.getUTCDate() + (previous.effective_to ? 1 : 365));
const nextDate = nextDateValue.toISOString().slice(0, 10);
const expectedEnd = new Date(`${nextDate}T00:00:00Z`);
expectedEnd.setUTCDate(expectedEnd.getUTCDate() - 1);
const expectedEndDate = expectedEnd.toISOString().slice(0, 10);
const admin = await login('TEST-P2-ADMIN', '0990000104');
const hr = await login('TEST-P2-HR', '0990000103');
if (admin.status !== 200 || !admin.cookies || hr.status !== 200 || !hr.cookies)
  throw new Error('Synthetic admin or HR login failed.');
const payload = {
  effective_from: nextDate, effective_to: null, start_time: '09:00', lunch_start: '12:30',
  lunch_end: '13:30', end_time: '18:00', working_weekdays: [1, 2, 3, 4, 5],
  late_grace_minutes: 10, photo_retention_days: 90,
};
let createdId = '';
try {
  const forbidden = await request('/api/v1/admin/settings/work-policies', hr.cookies,
    { method: 'POST', body: JSON.stringify(payload) });
  check('HR cannot create a shared-shift version', forbidden.status === 403);
  const created = await request('/api/v1/admin/settings/work-policies', admin.cookies,
    { method: 'POST', body: JSON.stringify(payload) });
  check('Admin creates the next shared-shift version', created.status === 201 && !!created.body?.data?.id,
    `${created.status} ${created.body?.error?.code ?? ''}`);
  createdId = created.body?.data?.id ?? '';
  if (!createdId) throw new Error('Cannot inspect a version without its ID.');
  const [oldRow, newRow] = await Promise.all([
    service.from('work_policies').select('effective_to').eq('id', previous.id).single(),
    service.from('work_policies').select('effective_from,effective_to,start_time,end_time')
      .eq('id', createdId).single(),
  ]);
  check('Previous version closes on the day before the new one',
    !oldRow.error && oldRow.data?.effective_to === expectedEndDate);
  check('New version has no end date and uses the configured times',
    !newRow.error && newRow.data?.effective_from === nextDate &&
    newRow.data?.effective_to === null && newRow.data?.start_time?.startsWith('09:00') &&
    newRow.data?.end_time?.startsWith('18:00'));
  const overlap = await request('/api/v1/admin/settings/work-policies', admin.cookies,
    { method: 'POST', body: JSON.stringify(payload) });
  check('Overlapping effective date is rejected', overlap.status === 409);
  const direct = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } });
  const signed = await direct.auth.signInWithPassword({ email: 'test-p2-admin@example.com',
    password: credentials.passwords['TEST-P2-ADMIN'] });
  if (signed.error) throw new Error('Direct synthetic admin login failed.');
  const directWrite = await direct.from('work_policies').insert({
    effective_from: '2200-01-01', start_time: '09:00', lunch_start: '12:30',
    lunch_end: '13:30', end_time: '18:00', working_weekdays: [1, 2, 3, 4, 5],
    late_grace_minutes: 10, photo_retention_days: 90,
  });
  check('Direct table insert is denied even to an authenticated admin', !!directWrite.error);
} finally {
  if (createdId) {
    const removed = await service.from('work_policies').delete().eq('id', createdId);
    if (removed.error) throw new Error('Could not remove the synthetic shared-shift version.');
  }
  const restored = await service.from('work_policies').update({ effective_to: previous.effective_to })
    .eq('id', previous.id);
  if (restored.error) throw new Error('Could not restore the previous shared-shift end date.');
}
console.log('PASS Synthetic shared-shift version removed and previous end date restored');
process.exitCode = failures ? 1 : 0;
