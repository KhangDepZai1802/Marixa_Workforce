#!/usr/bin/env node
// Phase 3 access checks against the synthetic test accounts and localhost only.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomInt, randomUUID } from 'node:crypto';
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
const base = process.env.VERIFY_BASE_URL || 'http://localhost:3000';
if (!['http://localhost:3000','http://localhost:3001'].includes(base)) throw new Error('Local test server only.');
const client = key => createClient(env.NEXT_PUBLIC_SUPABASE_URL, key,
  { auth: { autoRefreshToken: false, persistSession: false } });
const service = client(env.SUPABASE_SECRET_KEY);
let failures = 0;
function check(label, passed, detail = '') {
  console.log(`${passed ? 'PASS' : 'FAIL'} ${label}${detail ? ` (${detail})` : ''}`);
  if (!passed) failures++;
}
async function request(route, cookie = '', options = {}) {
  const response = await fetch(base + route, {
    ...options, redirect: 'manual', headers: {
      Origin: base, ...(cookie ? { Cookie: cookie } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  const cookies = response.headers.getSetCookie().map(value => value.split(';', 1)[0]).join('; ');
  const body = await response.json().catch(() => null);
  return { status: response.status, cookies, body, cache: response.headers.get('cache-control'),
    location: response.headers.get('location') };
}
async function hasAudit(result, action, entityId) {
  if (!result.body?.request_id) return false;
  const { data, error } = await service.from('audit_logs').select('id,actor_user_id,action,entity_id')
    .eq('request_id', result.body.request_id).eq('action', action).eq('entity_id', entityId);
  return !error && data?.length === 1 && !!data[0].actor_user_id;
}
async function loginWithPassword(phone, password) {
  return request('/api/v1/auth/login', '', { method: 'POST',
    body: JSON.stringify({ phone, password }) });
}
async function login(code, phone) {
  return loginWithPassword(phone, credentials.passwords[code]);
}

const { data: employee, error: employeeError } = await service.from('employees')
  .select('id').eq('employee_code', 'TEST-P2-A').single();
if (employeeError || !employee) throw new Error('Synthetic employee A is missing.');
const { data: account, error: accountError } = await service.from('app_users')
  .select('id,must_change_password').eq('employee_id', employee.id).single();
if (accountError || !account || account.must_change_password)
  throw new Error('Synthetic employee A must start with an established password.');

const changed = await service.from('app_users').update({ must_change_password: true }).eq('id', account.id);
if (changed.error) throw new Error('Could not set the temporary-password test flag.');
try {
  const a = await login('TEST-P2-A', '0990000101');
  check('Temporary password can sign in only to reach change-password', a.status === 200 &&
    a.body?.data?.must_change_password === true);
  if (a.status !== 200 || !a.cookies) throw new Error('Login did not produce a session cookie.');
  for (const route of ['/api/v1/me', '/api/v1/me/attendance', '/api/v1/me/requests',
    '/api/v1/me/work-policy', '/api/v1/attendance/events']) {
    const result = await request(route, a.cookies);
    check(`Temporary password blocked at ${route}`, result.status === 403 &&
      result.body?.error?.code === 'PASSWORD_CHANGE_REQUIRED');
    check(`Private response is not cacheable at ${route}`, result.cache?.includes('no-store'));
  }
  const cancel = await request(`/api/v1/requests/leave/${randomUUID()}/cancel`, a.cookies,
    { method: 'POST', body: JSON.stringify({ reason: 'synthetic test' }) });
  check('Temporary password blocked before cancellation', cancel.status === 403 &&
    cancel.body?.error?.code === 'PASSWORD_CHANGE_REQUIRED');

  const direct = client(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  const signed = await direct.auth.signInWithPassword({ email: 'test-p2-a@example.com',
    password: credentials.passwords['TEST-P2-A'] });
  if (signed.error) throw new Error('Direct synthetic login failed.');
  const [employees, events, policies, ownAccount] = await Promise.all([
    direct.from('employees').select('id'),
    direct.from('attendance_events').select('id'),
    direct.from('work_policies').select('id'),
    direct.from('app_users').select('id,must_change_password'),
  ]);
  check('RLS hides employee, attendance and policy data until password change',
    !employees.error && !events.error && !policies.error &&
    employees.data.length === 0 && events.data.length === 0 && policies.data.length === 0);
  check('RLS keeps only own account flag visible for password flow',
    !ownAccount.error && ownAccount.data.length === 1 && ownAccount.data[0].must_change_password === true);
} finally {
  const restored = await service.from('app_users').update({ must_change_password: false }).eq('id', account.id);
  if (restored.error) throw new Error('Could not restore synthetic account A after the test.');
}

const hr = await login('TEST-P2-HR', '0990000103');
check('HR signs in', hr.status === 200 && hr.body?.data?.role === 'hr');
if (hr.cookies) {
  const list = await request('/api/v1/hr/employees', hr.cookies);
  const forbidden = await request('/api/v1/admin/accounts', hr.cookies);
  check('HR can list employees', list.status === 200);
  check('HR cannot list admin accounts', forbidden.status === 403);
  const hrAdminPage = await request('/admin/accounts', hr.cookies);
  check('HR cannot open admin UI directly', hrAdminPage.status === 307 &&
    hrAdminPage.location?.endsWith('/today'));
  const hrRoleChange = await request(`/api/v1/admin/accounts/${randomUUID()}`, hr.cookies,
    { method: 'PATCH', body: JSON.stringify({ role: 'admin' }) });
  check('HR cannot change a role through API', hrRoleChange.status === 403);
  const employeeB = list.body?.data?.find(row => row.employee_code === 'TEST-P2-B');
  if (!employeeB) throw new Error('Synthetic employee B is missing from the HR list.');
  try {
    const changedEmail = await request(`/api/v1/hr/employees/${employeeB.id}`, hr.cookies,
      { method: 'PATCH', body: JSON.stringify({ work_email: `phase3-${randomUUID()}@example.com` }) });
    check('HR can edit a synthetic employee profile', changedEmail.status === 200);
    if (changedEmail.status === 200) {
      const bWithChangedProfile = await login('TEST-P2-B', '0990000102');
      check('Phone login uses linked Auth identity after profile email edit',
        bWithChangedProfile.status === 200);
    }
  } finally {
    const restoredEmail = await service.from('employees').update({ work_email: employeeB.work_email })
      .eq('id', employeeB.id);
    if (restoredEmail.error) throw new Error('Could not restore synthetic employee B email.');
  }
}
const admin = await login('TEST-P2-ADMIN', '0990000104');
check('Admin signs in', admin.status === 200 && admin.body?.data?.role === 'admin');
if (admin.cookies) {
  const list = await request('/api/v1/admin/accounts', admin.cookies);
  check('Admin can list accounts', list.status === 200);
  const adminRow = list.body?.data?.find(row => row.role === 'admin' && row.status === 'active');
  if (!adminRow) throw new Error('Synthetic active admin account is missing.');
  const lastAdmin = await request(`/api/v1/admin/accounts/${adminRow.id}`, admin.cookies,
    { method: 'PATCH', body: JSON.stringify({ status: 'disabled' }) });
  check('Last active admin cannot be disabled', lastAdmin.status === 409 &&
    lastAdmin.body?.error?.code === 'LAST_ADMIN_PROTECTED');
  const demoteLastAdmin = await request(`/api/v1/admin/accounts/${adminRow.id}`, admin.cookies,
    { method: 'PATCH', body: JSON.stringify({ role: 'hr' }) });
  check('Last active admin cannot be demoted', demoteLastAdmin.status === 409 &&
    demoteLastAdmin.body?.error?.code === 'LAST_ADMIN_PROTECTED');
  const { data: bEmployee, error: bEmployeeError } = await service.from('employees')
    .select('id').eq('employee_code', 'TEST-P2-B').single();
  if (bEmployeeError || !bEmployee) throw new Error('Synthetic employee B is missing.');
  const { data: bAccount, error: bAccountError } = await service.from('app_users')
    .select('id,auth_user_id,status,must_change_password').eq('employee_id', bEmployee.id).single();
  if (bAccountError || !bAccount || bAccount.status !== 'active' || bAccount.must_change_password)
    throw new Error('Synthetic account B is not in the expected initial state.');
  const temporary = `Temp-${randomUUID()}-9a`;
  const replacement = `New-${randomUUID()}-9a`;
  try {
    const reset = await request(`/api/v1/admin/accounts/${bAccount.id}/reset-password`, admin.cookies,
      { method: 'POST', body: JSON.stringify({ temporary_password: temporary }) });
    check('Admin can reset a synthetic account', reset.status === 200);
    check('Password reset creates an audit row', await hasAudit(reset, 'account.password_reset', bAccount.id));
    if (reset.status !== 200) throw new Error('Cannot continue the password lifecycle test.');
    const bTemporary = await loginWithPassword('0990000102', temporary);
    check('Reset password requires first-login change', bTemporary.status === 200 &&
      bTemporary.body?.data?.must_change_password === true);
    if (!bTemporary.cookies) throw new Error('Synthetic account B has no session cookie.');
    const changedPassword = await request('/api/v1/me/change-password', bTemporary.cookies,
      { method: 'POST', body: JSON.stringify({ new_password: replacement }) });
    check('Employee can complete the password change', changedPassword.status === 200);
    const profile = await request('/api/v1/me', bTemporary.cookies);
    check('New password unlocks the private API', profile.status === 200);
    const disabled = await request(`/api/v1/admin/accounts/${bAccount.id}`, admin.cookies,
      { method: 'PATCH', body: JSON.stringify({ status: 'disabled' }) });
    check('Admin can disable a synthetic account', disabled.status === 200);
    check('Account lock creates an audit row', await hasAudit(disabled, 'account.updated', bAccount.id));
    const denied = await loginWithPassword('0990000102', replacement);
    check('Disabled account cannot sign in', denied.status === 403 &&
      denied.body?.error?.code === 'ACCOUNT_UNAVAILABLE');
    const oldSession = await request('/api/v1/me', bTemporary.cookies);
    check('Disabled account loses private API access', oldSession.status === 401);
    const { data: retainedProfile, error: retainedError } = await service.from('employees')
      .select('id').eq('id', bEmployee.id).single();
    check('Disabling an account retains its employee profile', !retainedError && retainedProfile?.id === bEmployee.id);
  } finally {
    const password = await service.auth.admin.updateUserById(bAccount.auth_user_id,
      { password: credentials.passwords['TEST-P2-B'] });
    const state = await service.from('app_users').update({ status: 'active', must_change_password: false })
      .eq('id', bAccount.id);
    if (password.error || state.error) throw new Error('Could not restore synthetic account B.');
  }
  const restored = await login('TEST-P2-B', '0990000102');
  check('Synthetic account B restored', restored.status === 200 &&
    restored.body?.data?.must_change_password === false);
  if (restored.cookies) {
    const employeeAdminPage = await request('/admin/accounts', restored.cookies);
    const employeeHrPage = await request('/hr/employees', restored.cookies);
    check('Employee cannot open HR or admin UI directly',
      employeeAdminPage.status === 307 && employeeAdminPage.location?.endsWith('/today') &&
      employeeHrPage.status === 307 && employeeHrPage.location?.endsWith('/today'));
    const direct = client(env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
    const signed = await direct.auth.signInWithPassword({ email: 'test-p2-b@example.com',
      password: credentials.passwords['TEST-P2-B'] });
    if (signed.error) throw new Error('Could not sign in as synthetic B for RLS role test.');
    const directRole = await direct.from('app_users').update({ role: 'admin' })
      .eq('employee_id', bEmployee.id).select('id');
    check('Employee cannot promote own role through RLS', !!directRole.error || directRole.data?.length === 0);
    const effectivePolicy = await request('/api/v1/me/work-policy', restored.cookies);
    check('Employee can read the effective shared shift', effectivePolicy.status === 200 &&
      !!effectivePolicy.body?.data?.start_time && !!effectivePolicy.body?.data?.end_time);
    const wrongOwner = await request('/api/v1/attendance/events', restored.cookies, { method: 'POST',
      body: JSON.stringify({ kind: 'check_in', source: 'offline',
        device_occurred_at: new Date().toISOString(), idempotency_key: randomUUID(),
        queue_owner_id: employee.id, photo_expected: false }) });
    check('Queued event from another employee cannot be attributed to this session',
      wrongOwner.status === 403 && wrongOwner.body?.error?.code === 'QUEUE_OWNER_MISMATCH');
    const logout = await request('/api/v1/auth/logout', restored.cookies, { method: 'POST' });
    check('Employee can log out', logout.status === 200 && logout.body?.data?.signed_out === true);
    const staleSession = await request('/api/v1/me', restored.cookies);
    const stalePage = await request('/my-profile', restored.cookies);
    check('Revoked session cannot call private API', staleSession.status === 401);
    check('Revoked session is redirected from private UI', stalePage.status === 307 &&
      stalePage.location?.endsWith('/login'));
  }
}
if (hr.cookies && admin.cookies) {
  const marker = randomUUID();
  const code = `TEST-P3-${marker.slice(0, 8).toUpperCase()}`;
  const phone = `09${String(randomInt(0, 100000000)).padStart(8, '0')}`;
  const email = `test-p3-${marker}@example.com`;
  const temporary = `Temp-${randomUUID()}-9a`;
  let createdEmployeeId = '';
  let createdAccountId = '';
  let createdAuthId = '';
  try {
    const profile = await request('/api/v1/hr/employees', hr.cookies, { method: 'POST',
      body: JSON.stringify({ employee_code: code, full_name: 'Nhân viên thử Phase 3', work_email: email, phone }) });
    check('HR can create a synthetic employee profile', profile.status === 201 && !!profile.body?.data?.id);
    createdEmployeeId = profile.body?.data?.id ?? '';
    if (!createdEmployeeId) throw new Error('Cannot continue without the synthetic employee ID.');
    const rejectedAdmin = await request('/api/v1/admin/accounts', admin.cookies, { method: 'POST',
      body: JSON.stringify({ employee_id: createdEmployeeId, role: 'admin', email,
        temporary_password: temporary }) });
    check('Provisioning a second active admin is rejected', rejectedAdmin.status === 409 &&
      rejectedAdmin.body?.error?.code === 'ACTIVE_ADMIN_EXISTS');
    const account = await request('/api/v1/admin/accounts', admin.cookies, { method: 'POST',
      body: JSON.stringify({ employee_id: createdEmployeeId, role: 'employee', email,
        temporary_password: temporary }) });
    check('Admin can provision the linked Auth account', account.status === 201 && !!account.body?.data?.id);
    createdAccountId = account.body?.data?.id ?? '';
    if (!createdAccountId) throw new Error('Cannot continue without the synthetic account ID.');
    check('Account provisioning creates an audit row', await hasAudit(account, 'account.created', createdAccountId));
    const linked = await service.from('app_users').select('auth_user_id').eq('id', createdAccountId).single();
    if (linked.error || !linked.data) throw new Error('Could not find the new synthetic Auth ID.');
    createdAuthId = linked.data.auth_user_id;
    const firstLogin = await loginWithPassword(phone, temporary);
    check('New account signs in and must change its temporary password',
      firstLogin.status === 200 && firstLogin.body?.data?.must_change_password === true);
    const firstPage = await request('/today', firstLogin.cookies);
    check('Temporary password cannot open the attendance UI', firstPage.status === 307 &&
      firstPage.location?.endsWith('/change-password'));
    const promote = await request(`/api/v1/admin/accounts/${createdAccountId}`, admin.cookies,
      { method: 'PATCH', body: JSON.stringify({ role: 'hr' }) });
    check('Admin can change role of synthetic account', promote.status === 200 &&
      promote.body?.data?.role === 'hr');
    check('Role change creates an audit row', await hasAudit(promote, 'account.updated', createdAccountId));
    const secondAdmin = await request(`/api/v1/admin/accounts/${createdAccountId}`, admin.cookies,
      { method: 'PATCH', body: JSON.stringify({ role: 'admin' }) });
    check('Second active admin is blocked by database constraint', secondAdmin.status === 409 &&
      secondAdmin.body?.error?.code === 'ACTIVE_ADMIN_EXISTS');
  } finally {
    if (createdEmployeeId && !createdAccountId) {
      const orphan = await service.from('app_users').select('id,auth_user_id')
        .eq('employee_id', createdEmployeeId).maybeSingle();
      if (orphan.data) {
        createdAccountId = orphan.data.id;
        createdAuthId = orphan.data.auth_user_id;
      }
    }
    if (createdAccountId) {
      const removed = await service.from('app_users').delete().eq('id', createdAccountId);
      if (removed.error) throw new Error('Could not remove the synthetic account.');
    }
    if (createdAuthId) {
      const removed = await service.auth.admin.deleteUser(createdAuthId);
      if (removed.error) throw new Error('Could not remove the synthetic Auth user.');
    }
    if (createdEmployeeId) {
      const removed = await service.from('employees').delete().eq('id', createdEmployeeId);
      if (removed.error) throw new Error('Could not remove the synthetic profile.');
    }
  }
  check('Temporary profile and Auth account were removed', !!createdEmployeeId && !!createdAccountId);
}
process.exitCode = failures ? 1 : 0;
