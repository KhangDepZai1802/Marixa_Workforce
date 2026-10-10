#!/usr/bin/env node
// End-to-end checks on the designated synthetic Supabase project and a running local Next server.
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
  return match ? [[match[1], match[2].trim().replace(/^(["'])(.*)\1$/, '$2')]] : [];
}));
const credentials = JSON.parse(readFileSync(path.join(root, '.env.phase2.local'), 'utf8'));
const ref = 'pkpwcpatuslfjyoivbuf';
if (credentials.ref !== ref || env.NEXT_PUBLIC_SUPABASE_URL !== `https://${ref}.supabase.co` || !env.SUPABASE_SECRET_KEY)
  throw new Error('Phase 4 verification is restricted to the synthetic test project.');
const base = process.env.PHASE4_BASE_URL || env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } });
const runId = randomUUID().slice(0, 8);
const uiOnly = process.env.PHASE4_UI_ONLY === '1';
const created = [];
let temporaryOffice = null;
const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9YhJ2ioAAAAASUVORK5CYII=', 'base64'));

function need(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.code || result.error.message}`);
  return result.data;
}
function check(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`);
  console.log(`PASS ${label}`);
}
async function request(session, route, { method = 'GET', body, json = false } = {}) {
  const headers = { Origin: base };
  if (session.cookie) headers.Cookie = session.cookie;
  if (json) headers['Content-Type'] = 'application/json';
  const response = await fetch(base + route, { method, headers, body, redirect: 'manual' });
  const cookies = response.headers.getSetCookie().map(item => item.split(';', 1)[0]);
  if (cookies.length) session.cookie = [...new Map([...session.cookie.split('; ').filter(Boolean), ...cookies]
    .map(item => [item.split('=')[0], item])).values()].join('; ');
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}
async function login(phone, password) {
  const session = { cookie: '' };
  const response = await request(session, '/api/v1/auth/login', { method: 'POST', json: true,
    body: JSON.stringify({ phone, password }) });
  if (response.status !== 200)
    throw new Error(`Synthetic account sign-in failed: HTTP ${response.status}, ${response.data?.error?.code ?? 'no API code'}`);
  check('Synthetic account signs in', true);
  return session;
}
async function newEmployee(index) {
  const email = `phase4-${runId}-${index}@example.com`;
  const phone = `0999${String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')}`;
  const password = `Test-${randomUUID()}-9a`;
  const auth = need(await service.auth.admin.createUser({ email, password, email_confirm: true }), 'Create synthetic Auth user').user;
  const item = { authId: auth.id, employeeId: null, accountId: null, events: [], photoPaths: [] };
  created.push(item);
  const employee = need(await service.from('employees').insert({ employee_code: `TEST-P4-${runId}-${index}`,
    full_name: `Kiểm thử Phase 4 ${index}`, work_email: email, phone, status: 'active' })
    .select('id').single(), 'Create synthetic employee');
  item.employeeId = employee.id;
  const account = need(await service.from('app_users').insert({ auth_user_id: auth.id,
    employee_id: employee.id, role: 'employee', status: 'active', must_change_password: false })
    .select('id').single(), 'Create synthetic app account');
  item.accountId = account.id;
  return { ...item, email, phone, password, session: await login(phone, password) };
}
async function verifyBrowser(user) {
  const profile = mkdtempSync(path.join(tmpdir(), 'marixa-phase4-ui-'));
  const port = 9400 + Math.floor(Math.random() * 500);
  const browser = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--remote-allow-origins=*',
      `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'],
    { stdio: 'ignore', windowsHide: true });
  let socket;
  let sequence = 0;
  const pending = new Map();
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  async function waitUntil(callback, label, limit = 20000) {
    const end = Date.now() + limit;
    while (Date.now() < end) {
      try { if (await callback()) return; } catch { /* Navigation can replace the execution context. */ }
      await pause(160);
    }
    throw new Error(`Browser timed out: ${label}`);
  }
  function send(method, params = {}) {
    const id = ++sequence;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
    return result.result?.value;
  }
  try {
    await waitUntil(async () => { try { return (await fetch(`http://127.0.0.1:${port}/json/version`)).ok; } catch { return false; } }, 'Chrome CDP');
    const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?${base}/login`, { method: 'PUT' })).json();
    socket = new WebSocket(tab.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    });
    socket.addEventListener('message', event => {
      const response = JSON.parse(event.data);
      if (!response.id || !pending.has(response.id)) return;
      const item = pending.get(response.id);
      pending.delete(response.id);
      if (response.error) item.reject(new Error(response.error.message));
      else item.resolve(response.result);
    });
    await send('Page.enable');
    await send('Network.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
    for (const cookie of user.session.cookie.split('; ').filter(Boolean)) {
      const separator = cookie.indexOf('=');
      await send('Network.setCookie', { name: cookie.slice(0, separator), value: cookie.slice(separator + 1), url: base });
    }
    await send('Page.navigate', { url: `${base}/today` });
    try {
      await waitUntil(() => evaluate('location.pathname === "/today" && !![...document.querySelectorAll(".desktop-attendance-content button")].find(b => b.textContent.includes("Chấm ra"))'), 'check-out button');
    } catch (error) {
      const state = await evaluate('({ path: location.pathname, text: document.body.innerText.slice(0, 500) })');
      throw new Error(`${error.message}; browser state: ${JSON.stringify(state)}`);
    }
    check('Browser shows check-out after check-in', true);
    await evaluate(`(() => {
      const bytes = Uint8Array.from(atob(${JSON.stringify(Buffer.from(png).toString('base64'))}), c => c.charCodeAt(0));
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], 'camera.png', { type: 'image/png' }));
      const input = document.querySelector('input[type=file]');
      input.files = transfer.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    })()`);
    await waitUntil(() => evaluate('document.body.innerText.includes("Ảnh sẵn sàng:")'), 'photo compression');
    check('Browser compresses optional photo', true);
    await evaluate('[...document.querySelectorAll(".desktop-attendance-content button")].find(b => b.textContent.includes("Bỏ ảnh")).click()');
    await waitUntil(() => evaluate('!document.body.innerText.includes("Ảnh sẵn sàng:")'), 'remove optional photo');
    check('Browser allows removing selected photo', true);
    await send('Browser.setPermission', { permission: { name: 'geolocation' }, setting: 'denied', origin: base });
    await evaluate('document.querySelector("input[type=checkbox]").click()');
    await evaluate('[...document.querySelectorAll(".desktop-attendance-content button")].find(b => b.textContent.includes("Chấm ra")).click()');
    await waitUntil(() => evaluate('document.body?.innerText.includes("Không có vị trí")'), 'GPS denial notice');
    try {
      await waitUntil(() => evaluate('document.body?.innerText.includes("Xem lịch sử chấm công") && document.body?.innerText.includes("Đã ghi nhận giờ ra")'), 'completed-state history action');
    } catch (error) {
      const state = await evaluate('({ path: location.pathname, text: document.body.innerText.slice(0, 1200) })');
      throw new Error(`${error.message}; browser state: ${JSON.stringify(state)}`);
    }
    check('Browser records attendance after GPS denial and links to history', true);
  } finally {
    socket?.close();
    browser.kill();
    await pause(800);
    rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

try {
  const expiryPolicyMigration = need(await service.from('app_schema_migrations').select('version')
    .eq('version', '202610100015_photo_expiry_read_policy.sql').maybeSingle(), 'Check photo expiry migration');
  check('Photo expiry policy migration is applied', !!expiryPolicyMigration);
  const officeRows = need(await service.from('office_locations').select('id,latitude,longitude,radius_m')
    .eq('active', true).order('created_at').limit(1), 'Read active office');
  let office = officeRows[0];
  if (!office) {
    office = need(await service.from('office_locations').insert({ name: `Phase 4 ${runId}`,
      latitude: 0, longitude: 0, radius_m: 100, active: true }).select('id,latitude,longitude,radius_m').single(), 'Create temporary office');
    temporaryOffice = office.id;
  }
  const inside = { latitude: office.latitude, longitude: office.longitude, accuracy_m: 1 };
  const outside = { latitude: office.latitude > 0 ? -60 : 60,
    longitude: office.longitude > 0 ? -120 : 120, accuracy_m: 1 };
  const cases = [
    { name: 'photo and GPS', photo: true, gps: inside, expectedFlag: 'inside' },
    { name: 'photo only', photo: true, gps: null, expectedFlag: 'unknown' },
    { name: 'GPS only outside', photo: false, gps: outside, expectedFlag: 'outside' },
    { name: 'neither photo nor GPS', photo: false, gps: null, expectedFlag: 'unknown' },
  ].slice(0, uiOnly ? 1 : 4);
  const users = [];
  for (const [index, scenario] of cases.entries()) {
    const user = await newEmployee(index);
    users.push(user);
    const key = randomUUID();
    const deviceTime = new Date(Date.now() - 60_000).toISOString();
    const started = Date.now();
    const payload = { kind: 'check_in', source: 'online', device_occurred_at: deviceTime,
      idempotency_key: key, queue_owner_id: user.employeeId, photo_expected: scenario.photo,
      latitude: scenario.gps?.latitude ?? null, longitude: scenario.gps?.longitude ?? null,
      accuracy_m: scenario.gps?.accuracy_m ?? null };
    const first = await request(user.session, '/api/v1/attendance/events', { method: 'POST', json: true,
      body: JSON.stringify(payload) });
    if (first.data?.data?.id) created[index].events.push(first.data.data.id);
    check(`${scenario.name}: event recorded`, first.status === 201 && !!first.data?.data?.id);
    const event = first.data.data;
    check(`${scenario.name}: server time and device time are distinct`,
      Date.parse(event.occurred_at) >= started - 1000 && Date.parse(event.occurred_at) <= Date.now() + 1000 &&
      Date.parse(event.device_occurred_at) === Date.parse(deviceTime) && event.work_date ===
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(event.occurred_at)));
    check(`${scenario.name}: location and evidence flags`, event.location_flag === scenario.expectedFlag &&
      event.evidence_status === (scenario.photo ? 'pending' : 'not_provided'));
    const replay = await request(user.session, '/api/v1/attendance/events', { method: 'POST', json: true,
      body: JSON.stringify(payload) });
    check(`${scenario.name}: same key replays same event`, replay.status === 200 && replay.data?.data?.id === event.id);
    if (scenario.photo) {
      const storagePath = `${user.employeeId}/${event.work_date.replaceAll('-', '/')}/${event.id}.png`;
      created[index].photoPaths.push(storagePath);
      if (index === 1) {
        const direct = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
          { auth: { autoRefreshToken: false, persistSession: false } });
        need(await direct.auth.signInWithPassword({ email: user.email, password: user.password }), 'Sign in for interrupted-upload probe');
        need(await direct.storage.from('attendance-photos').upload(storagePath, png, { contentType: 'image/png' }),
          'Simulate an upload whose response was lost');
      }
      const form = new FormData();
      form.set('photo', new Blob([png], { type: 'image/png' }), 'phase4.png');
      const upload = await request(user.session, `/api/v1/attendance/events/${event.id}/photo`,
        { method: 'POST', body: form });
      check(`${scenario.name}: private photo registered${index === 1 ? ' after retry' : ''}`,
        upload.status === 201 && upload.data?.data?.evidence_status === 'ready');
      const owner = await request(user.session, `/api/v1/attendance/events/${event.id}/photo`);
      check(`${scenario.name}: owner may view private photo`, owner.status === 200 && !!owner.data?.data?.url);
    } else {
      const photos = need(await service.from('attendance_photos').select('id').eq('attendance_event_id', event.id), 'Check absent photo');
      check(`${scenario.name}: no photo metadata`, photos.length === 0);
    }
    const sameKind = await request(user.session, '/api/v1/attendance/events', { method: 'POST', json: true,
      body: JSON.stringify({ ...payload, idempotency_key: randomUUID() }) });
    check(`${scenario.name}: second device receives correction path`, sameKind.status === 409 &&
      sameKind.data?.error?.code === 'ATTENDANCE_ALREADY_EXISTS' && /sửa công/.test(sameKind.data?.error?.message));
  }
  if (uiOnly) {
    await verifyBrowser(users[0]);
    console.log('Phase 4 browser verification complete.');
  } else {
  const eventId = created[0].events[0];
  const pathToPhoto = `/api/v1/attendance/events/${eventId}/photo`;
  const stranger = await request(users[1].session, pathToPhoto);
  check('Other employee cannot view private photo', stranger.status === 404);
  const anonymous = await request({ cookie: '' }, pathToPhoto);
  check('Anonymous user cannot view private photo', anonymous.status === 401);
  const hr = await login('0990000103', credentials.passwords['TEST-P2-HR']);
  const admin = await login('0990000104', credentials.passwords['TEST-P2-ADMIN']);
  check('HR can view private photo', (await request(hr, pathToPhoto)).status === 200);
  check('Admin can view private photo', (await request(admin, pathToPhoto)).status === 200);
  await verifyBrowser(users[0]);
  need(await service.from('attendance_photos').update({ expires_at: new Date(Date.now() - 60_000).toISOString() })
    .eq('attendance_event_id', eventId), 'Expire synthetic photo');
  check('Expired photo link is denied by API', (await request(users[0].session, pathToPhoto)).status === 410);
  const direct = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } });
  need(await direct.auth.signInWithPassword({ email: users[0].email, password: users[0].password }), 'Sign in for expiry policy probe');
  const expiredDownload = await direct.storage.from('attendance-photos').download(created[0].photoPaths[0]);
  check('Expired photo is denied by Storage policy', !!expiredDownload.error);
  const hrList = await request(hr, '/api/v1/hr/attendance?from=' +
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()) + '&page_size=100');
  check('HR sees all four evidence combinations', hrList.status === 200 &&
    created.every(item => hrList.data?.data?.some(row => row.employee_id === item.employeeId)));
  console.log('Phase 4 integration verification complete.');
  }
} finally {
  for (const item of created.reverse()) {
    if (item.employeeId) {
      const events = need(await service.from('attendance_events').select('id').eq('employee_id', item.employeeId), 'Read test events for cleanup');
      const eventIds = events.map(event => event.id);
      const photos = eventIds.length ? need(await service.from('attendance_photos').select('id,storage_path').in('attendance_event_id', eventIds), 'Read test photos for cleanup') : [];
      const paths = [...new Set([...item.photoPaths, ...photos.map(photo => photo.storage_path)])];
      if (paths.length) need(await service.storage.from('attendance-photos').remove(paths), 'Delete test photo objects');
      if (photos.length) need(await service.from('attendance_photos').delete().in('id', photos.map(photo => photo.id)), 'Delete test photo metadata');
      if (eventIds.length) need(await service.from('attendance_events').delete().in('id', eventIds), 'Delete test attendance events');
    }
    if (item.accountId) {
      need(await service.from('audit_logs').delete().eq('actor_user_id', item.accountId), 'Delete synthetic audit rows');
      need(await service.from('app_users').delete().eq('id', item.accountId), 'Delete synthetic app account');
    }
    if (item.employeeId) need(await service.from('employees').delete().eq('id', item.employeeId), 'Delete synthetic employee');
    need(await service.auth.admin.deleteUser(item.authId), 'Delete synthetic Auth user');
  }
  if (temporaryOffice) need(await service.from('office_locations').delete().eq('id', temporaryOffice), 'Delete temporary office');
}
