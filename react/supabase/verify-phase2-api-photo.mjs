#!/usr/bin/env node
// Smoke-test the real Next.js login, attendance, and photo Route Handlers.
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  return match ? [[match[1], match[2].trim().replace(/^(["'])(.*)\1$/, '$2')]] : [];
}));
const credentialsPath = path.join(root, '.env.phase2.local');
const credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
if (env.NEXT_PUBLIC_SUPABASE_URL !== 'https://pkpwcpatuslfjyoivbuf.supabase.co' ||
  credentials.ref !== 'pkpwcpatuslfjyoivbuf') throw new Error('Sai project test.');
if (!credentials.apiPhotoKey) {
  credentials.apiPhotoKey = randomUUID();
  writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2) + '\n');
}
const base = 'http://localhost:3000';
let cookie = '';
async function request(route, { method = 'GET', body, json = false } = {}) {
  const headers = { Origin: base };
  if (cookie) headers.Cookie = cookie;
  if (json) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + route, { method, headers, body, redirect: 'manual' });
  const newCookies = response.headers.getSetCookie().map(item => item.split(';', 1)[0]);
  if (newCookies.length) cookie = [...new Map([...cookie.split('; ').filter(Boolean), ...newCookies]
    .map(item => [item.split('=')[0], item])).values()].join('; ');
  let data;
  try { data = await response.json(); } catch { data = null; }
  return { status: response.status, data };
}
function check(label, passed, detail = '') {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!passed) process.exitCode = 1;
}

const login = await request('/api/v1/auth/login', { method: 'POST', json: true,
  body: JSON.stringify({ phone: '0990000102', password: credentials.passwords['TEST-P2-B'] }) });
check('API đăng nhập bằng số điện thoại test', login.status === 200,
  `${login.status} ${login.data?.error?.code ?? ''}`);
if (login.status !== 200) process.exit(1);
const event = await request('/api/v1/attendance/events', { method: 'POST', json: true,
  body: JSON.stringify({ kind: 'check_in', source: 'online', idempotency_key: credentials.apiPhotoKey,
    photo_expected: true }) });
check('API tạo/đối chiếu event không GPS', [200, 201].includes(event.status) && !!event.data?.data?.id,
  `${event.status} ${event.data?.error?.code ?? ''}`);
if (!event.data?.data?.id) process.exit(1);
const id = event.data.data.id;
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YhJ2ioAAAAASUVORK5CYII=', 'base64'));
const form = new FormData();
form.append('photo', new Blob([png], { type: 'image/png' }), 'phase2-test.png');
const uploaded = await request(`/api/v1/attendance/events/${id}/photo`, { method: 'POST', body: form });
check('API upload và đăng ký ảnh PNG', [200, 201].includes(uploaded.status) &&
  uploaded.data?.data?.evidence_status === 'ready', `${uploaded.status} ${uploaded.data?.error?.code ?? ''}`);
const fetched = await request(`/api/v1/attendance/events/${id}/photo`);
check('API trả liên kết ảnh riêng tư', fetched.status === 200 && !!fetched.data?.data?.url,
  `${fetched.status} ${fetched.data?.error?.code ?? ''}`);
