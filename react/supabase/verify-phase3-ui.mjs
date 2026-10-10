#!/usr/bin/env node
// Browser smoke test for Phase 3 with synthetic credentials and localhost only.
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const credentials = JSON.parse(readFileSync(path.join(root, '.env.phase2.local'), 'utf8'));
if (credentials.ref !== 'pkpwcpatuslfjyoivbuf') throw new Error('Only the synthetic test project is allowed.');
const env = Object.fromEntries(readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  return match ? [[match[1], match[2].trim().replace(/^(["'])(.*)\1$/, '$2')]] : [];
}));
if (env.NEXT_PUBLIC_SUPABASE_URL !== 'https://pkpwcpatuslfjyoivbuf.supabase.co')
  throw new Error('The Supabase URL must point to the designated test project.');
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } });
let temporaryAccount;
const chrome = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const profile = mkdtempSync(path.join(tmpdir(), 'marixa-phase3-ui-'));
const port = 9337;
const browser = spawn(chrome, ['--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--remote-allow-origins=*', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'],
  { stdio: ['ignore', 'ignore', 'pipe'], windowsHide: true });
let browserError = '';
browser.stderr.on('data', chunk => { browserError = (browserError + chunk.toString()).slice(-3000); });
let socket;
let sequence = 0;
const pending = new Map();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function waitUntil(callback, label, limit = 12000) {
  const end = Date.now() + limit;
  while (Date.now() < end) {
    if (await callback()) return;
    await pause(160);
  }
  throw new Error(`Timed out: ${label}`);
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
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result?.value;
}
async function navigate(route) {
  await send('Page.navigate', { url: `http://localhost:3000${route}` });
  await waitUntil(() => evaluate('document.readyState === "complete"'), `load ${route}`);
}
function check(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`);
  console.log(`PASS ${label}`);
}
async function fillLogin(phone, password) {
  await waitUntil(() => evaluate('!!document.querySelector("input[name=phone]")'), 'login form');
  await evaluate(`(() => {
    const values = ${JSON.stringify({ phone, password })};
    for (const [name, value] of Object.entries(values)) {
      const input = document.querySelector(name === 'phone' ? 'input[name=phone]' : 'input[type=password]');
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    document.querySelector('form').requestSubmit();
  })()`);
}
try {
  await waitUntil(async () => {
    try { return (await fetch(`http://127.0.0.1:${port}/json/version`)).ok; } catch { return false; }
  }, 'Chrome CDP', 15000);
  const tab = await (await fetch(`http://127.0.0.1:${port}/json/new?http://localhost:3000/login`,
    { method: 'PUT' })).json();
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
  socket.addEventListener('close', event => {
    for (const item of pending.values()) item.reject(new Error(`CDP socket closed (${event.code})`));
    pending.clear();
  });
  await send('Page.enable');
  await send('Network.enable');
  await navigate('/login');
  await pause(800);
  await fillLogin('0990000101', 'incorrect-password');
  await waitUntil(() => evaluate('document.body.innerText.includes("chưa chính xác")'), 'wrong password notice');
  check('Login UI explains invalid credentials', true);

  await send('Network.emulateNetworkConditions', { offline: true, latency: 0,
    downloadThroughput: 0, uploadThroughput: 0 });
  await fillLogin('0990000101', credentials.passwords['TEST-P2-A']);
  await waitUntil(() => evaluate('document.body.innerText.includes("Không kết nối được máy chủ")'), 'offline notice');
  check('Login UI explains network failure', true);
  await send('Network.emulateNetworkConditions', { offline: false, latency: 0,
    downloadThroughput: -1, uploadThroughput: -1 });

  await fillLogin('0990000101', credentials.passwords['TEST-P2-A']);
  await waitUntil(() => evaluate('location.pathname === "/today"'), 'employee login', 20000);
  check('Employee reaches private UI after login', true);
  await navigate('/my-profile');
  await waitUntil(() => evaluate('document.body.innerText.includes("Hồ sơ cá nhân") && !document.body.innerText.includes("Đang tải")'), 'profile UI');
  check('Employee profile page renders', true);
  await evaluate('document.querySelector(".signout").click()');
  await waitUntil(() => evaluate('location.pathname === "/login"'), 'employee logout');
  check('Logout button returns to login', true);
  await navigate('/today');
  await waitUntil(() => evaluate('location.pathname === "/login"'), 'private route after logout');
  check('Logged-out browser cannot open private UI', true);

  await fillLogin('0990000103', credentials.passwords['TEST-P2-HR']);
  await waitUntil(() => evaluate('location.pathname === "/today"'), 'HR login', 20000);
  check('HR can sign in through UI', true);
  await navigate('/hr/employees');
  await waitUntil(() => evaluate('document.body.innerText.includes("Hồ sơ nhân viên")'), 'HR employees UI');
  check('HR can open employee management UI', true);
  check('HR navigation omits admin accounts', !(await evaluate("!!document.querySelector('a[href=\"/admin/accounts\"]')")));
  await evaluate('document.querySelector(".signout").click()');
  await waitUntil(() => evaluate('location.pathname === "/login"'), 'HR logout');

  const { data: bEmployee } = await service.from('employees').select('id')
    .eq('employee_code', 'TEST-P2-B').single();
  if (!bEmployee) throw new Error('Synthetic employee B is missing.');
  const { data: bAccount } = await service.from('app_users')
    .select('id,auth_user_id,must_change_password').eq('employee_id', bEmployee.id).single();
  if (!bAccount || bAccount.must_change_password) throw new Error('Synthetic B has an unexpected password state.');
  temporaryAccount = bAccount;
  const flagged = await service.from('app_users').update({ must_change_password: true }).eq('id', bAccount.id);
  if (flagged.error) throw new Error('Could not set temporary-password state on synthetic B.');
  await fillLogin('0990000102', credentials.passwords['TEST-P2-B']);
  await waitUntil(() => evaluate('location.pathname === "/change-password"'), 'temporary password redirect', 20000);
  check('Temporary password redirects browser to change-password UI', true);
  const replacement = `New-${randomUUID()}-9a`;
  await evaluate(`(() => {
    const inputs = [...document.querySelectorAll('input[type=password]')];
    for (const input of inputs) {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, ${JSON.stringify(replacement)});
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    document.querySelector('form').requestSubmit();
  })()`);
  await waitUntil(() => evaluate('location.pathname === "/today"'), 'password changed in UI', 20000);
  check('User can change temporary password through UI', true);
  await evaluate('document.querySelector(".signout").click()');
  await waitUntil(() => evaluate('location.pathname === "/login"'), 'temporary account logout');
  const restoredPassword = await service.auth.admin.updateUserById(bAccount.auth_user_id,
    { password: credentials.passwords['TEST-P2-B'] });
  const restoredFlag = await service.from('app_users').update({ must_change_password: false })
    .eq('id', bAccount.id);
  if (restoredPassword.error || restoredFlag.error) throw new Error('Could not restore synthetic B after UI test.');
  temporaryAccount = undefined;

  await fillLogin('0990000104', credentials.passwords['TEST-P2-ADMIN']);
  await waitUntil(() => evaluate('location.pathname === "/today"'), 'admin login', 20000);
  await navigate('/admin/accounts');
  await waitUntil(() => evaluate('document.body.innerText.includes("Tài khoản và phân quyền")'), 'admin accounts UI');
  check('Admin can open account management UI', true);
  await navigate('/admin/audit');
  await waitUntil(() => evaluate('document.body.innerText.includes("Nhật ký hệ thống")'), 'admin audit UI');
  check('Admin can open audit UI', true);
  await send('Browser.close');
} catch (error) {
  console.error(error);
  if (browserError) console.error(browserError);
  process.exitCode = 1;
} finally {
  if (temporaryAccount) {
    const password = await service.auth.admin.updateUserById(temporaryAccount.auth_user_id,
      { password: credentials.passwords['TEST-P2-B'] });
    const flag = await service.from('app_users').update({ must_change_password: false })
      .eq('id', temporaryAccount.id);
    if (password.error || flag.error) {
      console.error('Could not restore synthetic B after failed UI test.');
      process.exitCode = 1;
    }
  }
  if (socket?.readyState === WebSocket.OPEN) socket.close();
  if (browser.exitCode === null) browser.kill();
  await pause(800);
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
  catch (error) { console.error('Temporary Chrome profile could not be removed:', error.message); }
}
