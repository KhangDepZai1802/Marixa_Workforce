#!/usr/bin/env node
// Local production build + synthetic test account. Cleans all cloud fixtures.
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  return match ? [[match[1], match[2].trim().replace(/^(\"|')(.*)\1$/, '$2')]] : [];
}));
if (env.NEXT_PUBLIC_SUPABASE_URL !== 'https://pkpwcpatuslfjyoivbuf.supabase.co' || !env.SUPABASE_SECRET_KEY)
  throw new Error('Only the verified synthetic test project is allowed.');
const base = process.env.PHASE5_BASE_URL || env.NEXT_PUBLIC_APP_URL;
if (!/^http:\/\/192\.168\./.test(base) && !/^http:\/\/localhost(:\d+)?$/.test(base))
  throw new Error('Run only against the local Next production server.');
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } });
const need = (result, label) => { if (result.error) throw new Error(`${label}: ${result.error.code ?? result.error.message}`); return result.data; };
const check = (label, valid) => { if (!valid) throw new Error(`FAIL ${label}`); console.log(`PASS ${label}`); };
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = mkdtempSync(path.join(tmpdir(), 'marixa-phase5-'));
const port = 9500 + Math.floor(Math.random() * 300);
const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--remote-allow-origins=*',
    `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'],
  { stdio: 'ignore', windowsHide: true });
let socket; let sequence = 0; const pending = new Map();
let authId, employeeId, accountId, eventId, photoPath;
function send(method, params = {}) {
  const id = ++sequence;
  return new Promise((resolve, reject) => { pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  return result.result?.value;
}
async function until(checker, label, timeout = 20000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { try { if (await checker()) return; } catch { /* navigation in progress */ } await wait(170); }
  throw new Error(`Timed out: ${label}`);
}
async function navigate(route) {
  await send('Page.navigate', { url: `${base}${route}` });
  await until(() => evaluate('document.readyState === "complete"'), `navigate ${route}`);
}
try {
  const suffix = randomUUID().slice(0, 8);
  const email = `phase5-${suffix}@example.invalid`;
  const phone = `0988${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;
  const password = `Test-${randomUUID()}-9a`;
  authId = need(await service.auth.admin.createUser({ email, password, email_confirm: true }), 'create Auth user').user.id;
  employeeId = need(await service.from('employees').insert({ employee_code: `TEST-P5-${suffix}`, full_name: 'Phase 5 browser fixture', work_email: email, phone, status: 'active' }).select('id').single(), 'create employee').id;
  accountId = need(await service.from('app_users').insert({ auth_user_id: authId, employee_id: employeeId, role: 'employee', status: 'active', must_change_password: false }).select('id').single(), 'create account').id;
  const login = await fetch(`${base}/api/v1/auth/login`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, password }) });
  if (login.status !== 200) {
    const body = await login.json().catch(() => null);
    throw new Error(`synthetic employee login: HTTP ${login.status}, ${body?.error?.code ?? 'unknown'}`);
  }
  check('synthetic employee login', true);
  const cookies = login.headers.getSetCookie().map(value => value.split(';', 1)[0]);
  await until(async () => { try { return (await fetch(`http://127.0.0.1:${port}/json/version`)).ok; } catch { return false; } }, 'Chrome CDP');
  const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?${base}/login`, { method: 'PUT' })).json();
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const response = JSON.parse(event.data);
    if (!response.id || !pending.has(response.id)) return;
    const item = pending.get(response.id); pending.delete(response.id);
    if (response.error) item.reject(new Error(response.error.message)); else item.resolve(response.result);
  });
  await send('Page.enable'); await send('Network.enable');
  for (const cookie of cookies) { const at = cookie.indexOf('='); await send('Network.setCookie', { name: cookie.slice(0, at), value: cookie.slice(at + 1), url: base }); }
  await navigate('/today');
  try { await until(() => evaluate('!![...document.querySelectorAll("button")].find(b => b.textContent.includes("Chấm vào") && !b.disabled)'), 'enabled check-in button'); } catch (error) { throw new Error(error.message + "; URL=" + await evaluate("location.href") + "; UI=" + await evaluate("document.body.innerText.slice(0,1600)")); }
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await until(() => evaluate('navigator.onLine === false'), 'browser offline state');
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YhJ2ioAAAAASUVORK5CYII=';
  await evaluate(`(() => {
    const bytes = Uint8Array.from(atob(${JSON.stringify(png)}), c => c.charCodeAt(0));
    const transfer = new DataTransfer(); transfer.items.add(new File([bytes], 'offline.png', { type: 'image/png' }));
    const input = document.querySelector('input[type=file]'); input.files = transfer.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await until(() => evaluate('document.body.innerText.includes("Ảnh đã nén:")'), 'photo ready');
  await evaluate('[...document.querySelectorAll("button")].find(b => b.textContent.includes("Chấm vào")).click()');
  try { await until(() => evaluate('document.body.innerText.includes("Đã lưu trên thiết bị")'), 'IndexedDB commit notice'); }
  catch (error) { throw new Error(`${error.message}; UI=${JSON.stringify(await evaluate('document.body.innerText.slice(0,900)'))}`); }
  const key = await evaluate(`(async () => {
    const db = await new Promise((resolve,reject) => { const r=indexedDB.open('marixa-attendance-queue',1); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
    const value = await new Promise((resolve,reject) => { const r=db.transaction('events','readonly').objectStore('events').getAll(); r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error); });
    db.close(); return value.find(x=>x.employee_id===${JSON.stringify(employeeId)})?.idempotency_key;
  })()`);
  check('offline queue stores owner, key and photo', !!key);
  await send('Network.setBlockedURLs', { urls: [`${base}/api/v1/attendance/events*`] });
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await navigate('/today');
  try { await until(() => evaluate('document.body.innerText.includes("1\\nlượt đang chờ")'), 'queue survives reload'); }
  catch (error) { throw new Error(`${error.message}; UI=${JSON.stringify(await evaluate('document.body.innerText.slice(0,950)'))}`); }
  check('queue survives reload before server confirmation', true);
  await send('Network.setBlockedURLs', { urls: [`${base}/api/v1/attendance/events/*/photo`] });
  await evaluate('[...document.querySelectorAll("button")].find(b => b.textContent.includes("Đồng bộ ngay")).click()');
  await until(async () => {
    const rows = need(await service.from('attendance_events').select('id,work_date,evidence_status').eq('employee_id', employeeId), 'read event');
    if (!rows.length) return false;
    eventId = rows[0].id;
    return true;
  }, 'server accepts queued event');
  await until(() => evaluate('document.body.innerText.includes("ảnh đang chờ đồng bộ")'), 'photo stays queued');
  check('event persists while photo upload fails', true);
  await send('Network.setBlockedURLs', { urls: [] });
  await evaluate('(() => { const button=[...document.querySelectorAll("button")].find(b => b.textContent.includes("Đồng bộ ngay") && !b.disabled); if(button) button.click(); })()');
  await until(() => evaluate('document.body.innerText.includes("Không có lượt chấm chờ")'), 'photo retry completes');
  const event = need(await service.from('attendance_events').select('id,evidence_status').eq('id', eventId).single(), 'read synced event');
  const photo = need(await service.from('attendance_photos').select('id,storage_path').eq('attendance_event_id', eventId).single(), 'read synced photo');
  photoPath = photo.storage_path;
  check('same event receives photo after retry', event.evidence_status === 'ready' && !!photo.id);
  const replay = await fetch(`${base}/api/v1/attendance/events`, { method: 'POST', headers: { Origin: base, Cookie: cookies.join('; '), 'Content-Type': 'application/json' }, body: JSON.stringify({ kind: 'check_in', source: 'offline', device_occurred_at: new Date().toISOString(), idempotency_key: key, queue_owner_id: employeeId, photo_expected: true }) });
  const replayData = await replay.json();
  check('retry key returns same server event', replay.status === 200 && replayData?.data?.id === eventId);
  const decisionArgs = { p_actor_auth_user_id: authId, p_adjustment_id: randomUUID(), p_decision: 'approved',
    p_regular_minutes_delta: 0, p_overtime_minutes_delta: 0, p_expected_regular_minutes: 0,
    p_expected_overtime_minutes: 0, p_note: 'Kiểm tra quyền Phase 5' };
  const serviceDecision = await service.rpc('review_late_attendance_adjustment', decisionArgs);
  check('new review RPC is available but rejects employee role', serviceDecision.error?.code === '42501');
  const direct = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } });
  need(await direct.auth.signInWithPassword({ email, password }), 'direct Auth sign in');
  const directDecision = await direct.rpc('review_late_attendance_adjustment', decisionArgs);
  check('authenticated client cannot bypass review API', !!directDecision.error &&
    (directDecision.error.code === '42501' || directDecision.error.code === 'PGRST301'));
  console.log('Phase 5 browser queue verification complete.');
} catch (error) { console.error(`FAIL: ${error.message}`); process.exitCode = 1; }
finally {
  socket?.close(); chrome.kill(); await wait(700);
  rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  if (employeeId) {
    const events = need(await service.from('attendance_events').select('id').eq('employee_id', employeeId), 'read cleanup events');
    const ids = events.map(row => row.id);
    if (ids.length) {
      const photos = need(await service.from('attendance_photos').select('id,storage_path').in('attendance_event_id', ids), 'read cleanup photos');
      const paths = [...new Set([photoPath, ...photos.map(row => row.storage_path)].filter(Boolean))];
      if (paths.length) need(await service.storage.from('attendance-photos').remove(paths), 'remove photo objects');
      if (photos.length) need(await service.from('attendance_photos').delete().in('id', photos.map(row => row.id)), 'remove photo metadata');
      need(await service.from('attendance_events').delete().in('id', ids), 'remove events');
    }
  }
  if (accountId) {
    need(await service.from('audit_logs').delete().eq('actor_user_id', accountId), 'remove audit');
    need(await service.from('app_users').delete().eq('id', accountId), 'remove account');
  }
  if (employeeId) need(await service.from('employees').delete().eq('id', employeeId), 'remove employee');
  if (authId) need(await service.auth.admin.deleteUser(authId), 'remove Auth user');
}
