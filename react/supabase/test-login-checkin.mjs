// Test E2E: login (cookie) -> check_in -> read event history (via public API with Origin header)
const BASE = 'http://localhost:3000';
const ORIGIN = 'http://localhost:3000';
import { randomUUID } from 'node:crypto';

async function api(path, { method = 'GET', body, cookies, setCookies = [] } = {}) {
  const headers = { 'Content-Type': 'application/json', Origin: ORIGIN };
  if (cookies) headers['Cookie'] = cookies;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { }
  return { status: res.status, json, text, cookies: setCookie };
}

const phone = process.argv[2] || '0900000001';
const pw = process.argv[3] || 'Hovaten123@';

// 1. Login
const login = await api('/api/v1/auth/login', { method: 'POST', body: { phone, password: pw } });
console.log('[login]', login.status, login.json?.data ?? login.text.slice(0, 200));
const cookie = login.cookies.map(c => c.split(';')[0]).join('; ');

// 2. /me
const me = await api('/api/v1/me', { cookies: cookie });
console.log('[me]', me.status, me.json?.data?.employee?.full_name, '->', me.json?.data?.account?.role);

// 3. check_in (idempotency key: same for all employee + day => safe re-test)
const key = randomUUID();
const now = new Date().toISOString();
const ci = await api('/api/v1/attendance/events', { method: 'POST', cookies: cookie, body: { kind: 'check_in', source: 'online', idempotency_key: key, device_occurred_at: now } });
console.log('[check_in]', ci.status, JSON.stringify(ci.json).slice(0, 300));

// 4. Retry with same key (idempotency - must return same event, no duplicate)
const ci2 = await api('/api/v1/attendance/events', { method: 'POST', cookies: cookie, body: { kind: 'check_in', source: 'online', idempotency_key: key, device_occurred_at: now } });
console.log('[check_in retry]', ci2.status, JSON.stringify(ci2.json).slice(0, 300));

// 5. History
const hist = await api('/api/v1/me/attendance', { cookies: cookie });
console.log('[history]', hist.status, JSON.stringify(hist.json).slice(0, 500));
