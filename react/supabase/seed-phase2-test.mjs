#!/usr/bin/env node
// Bootstrap synthetic test accounts via the Supabase HTTPS API without resetting data.
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(readFileSync(path.join(root, '.env.local'), 'utf8').split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  return match ? [[match[1], match[2].trim().replace(/^(["'])(.*)\1$/, '$2')]] : [];
}));
const ref = 'pkpwcpatuslfjyoivbuf';
if (env.NEXT_PUBLIC_SUPABASE_URL !== `https://${ref}.supabase.co` || !env.SUPABASE_SECRET_KEY)
  throw new Error('Thiếu secret key hoặc URL không khớp project test.');
const records = [
  { code: 'TEST-P2-A', name: 'Nhân viên thử A', email: 'test-p2-a@example.com', phone: '0990000101', role: 'employee' },
  { code: 'TEST-P2-B', name: 'Nhân viên thử B', email: 'test-p2-b@example.com', phone: '0990000102', role: 'employee' },
  { code: 'TEST-P2-HR', name: 'Nhân sự thử', email: 'test-p2-hr@example.com', phone: '0990000103', role: 'hr' },
  { code: 'TEST-P2-ADMIN', name: 'Quản trị thử', email: 'test-p2-admin@example.com', phone: '0990000104', role: 'admin' },
];
const credentialsPath = path.join(root, '.env.phase2.local');
const service = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } });
function need(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

try {
  const history = await service.from('app_schema_migrations').select('version', { count: 'exact', head: true });
  const expectedMigrations = readdirSync(path.join(root, 'supabase', 'migrations')).filter(name => /^\d{12}_.*\.sql$/.test(name)).length;
  if (history.error || history.count !== expectedMigrations) throw new Error('Cần áp đủ migration hiện hành trước khi seed.');
  const authUsers = [];
  for (let page = 1; ; page++) {
    const result = need(await service.auth.admin.listUsers({ page, perPage: 1000 }), 'Đọc Auth users');
    authUsers.push(...result.users);
    if (result.users.length < 1000) break;
  }

  let credentials;
  if (existsSync(credentialsPath)) {
    credentials = JSON.parse(readFileSync(credentialsPath, 'utf8'));
    if (credentials.ref !== ref || records.some(record => !credentials.passwords?.[record.code]))
      throw new Error('File tài khoản test local không khớp project hoặc thiếu mật khẩu.');
  } else {
    if (records.some(record => authUsers.some(user => user.email === record.email)))
      throw new Error('Auth có tài khoản test nhưng không có file local; dừng để tránh ghi đè.');
    credentials = { ref, passwords: Object.fromEntries(records.map(record =>
      [record.code, randomBytes(24).toString('base64url')])) };
    writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2) + '\n', { flag: 'wx' });
  }

  let adminAccountId;
  for (const record of records) {
    let authUser = authUsers.find(user => user.email === record.email);
    if (!authUser) {
      const result = need(await service.auth.admin.createUser({ email: record.email,
        password: credentials.passwords[record.code], email_confirm: true }), `Tạo Auth ${record.code}`);
      authUser = result.user;
    }
    let employee = need(await service.from('employees').select('id,work_email,phone')
      .eq('employee_code', record.code).maybeSingle(), `Đọc hồ sơ ${record.code}`);
    if (!employee) {
      employee = need(await service.from('employees').insert({ employee_code: record.code,
        full_name: record.name, work_email: record.email, phone: record.phone,
        department: 'Kiểm thử Phase 2', job_title: record.role, status: 'active' })
        .select('id,work_email,phone').single(), `Tạo hồ sơ ${record.code}`);
    }
    if (employee.work_email !== record.email || employee.phone !== record.phone)
      throw new Error(`Hồ sơ ${record.code} không khớp dữ liệu test.`);
    let account = need(await service.from('app_users').select('id,employee_id,role,must_change_password')
      .eq('auth_user_id', authUser.id).maybeSingle(), `Đọc tài khoản ${record.code}`);
    if (!account) {
      account = need(await service.from('app_users').insert({ auth_user_id: authUser.id,
        employee_id: employee.id, role: record.role, status: 'active', must_change_password: false })
        .select('id,employee_id,role,must_change_password').single(), `Gắn tài khoản ${record.code}`);
    }
    if (account.employee_id !== employee.id || account.role !== record.role)
      throw new Error(`Vai trò ${record.code} không khớp.`);
    if (account.must_change_password) {
      need(await service.from('app_users').update({ must_change_password: false }).eq('id', account.id),
        `Kích hoạt quyền kiểm thử ${record.code}`);
    }
    if (record.role === 'admin') adminAccountId = account.id;
  }
  for (const item of [
    { code: 'ANNUAL', name: 'Phép năm', deducts_annual_balance: true },
    { code: 'SICK', name: 'Nghỉ ốm', deducts_annual_balance: false },
    { code: 'UNPAID', name: 'Nghỉ không lương', deducts_annual_balance: false },
  ]) {
    const existing = need(await service.from('leave_types').select('id').eq('code', item.code).maybeSingle(),
      `Đọc loại nghỉ ${item.code}`);
    if (!existing) need(await service.from('leave_types').insert(item), `Tạo loại nghỉ ${item.code}`);
  }
  const policy = need(await service.from('work_policies').select('id').limit(1), 'Đọc ca mặc định');
  if (!policy.length) need(await service.from('work_policies').insert({ effective_from: new Date().toISOString().slice(0, 10),
    timezone: 'Asia/Ho_Chi_Minh', start_time: '08:00', lunch_start: '12:00', lunch_end: '13:00',
    end_time: '17:00', working_weekdays: [1, 2, 3, 4, 5, 6], late_grace_minutes: 0,
    photo_retention_days: 90 }), 'Tạo ca mặc định');
  const audit = need(await service.from('audit_logs').select('id').eq('action', 'phase2_test_fixture')
    .eq('entity_type', 'phase2').limit(1), 'Đọc audit mẫu');
  if (!audit.length) need(await service.from('audit_logs').insert({ actor_user_id: adminAccountId,
    action: 'phase2_test_fixture', entity_type: 'phase2', reason: 'Synthetic access-control probe' }),
    'Tạo audit mẫu');
  console.log('Đã tạo/đối chiếu 4 tài khoản giả (employee A/B, HR, admin), loại nghỉ và ca mặc định.');
  console.log('Mật khẩu nằm trong react/.env.phase2.local (Git bỏ qua); không in ra terminal.');
} catch (error) {
  console.error(`Dừng seed: ${error.message}`);
  process.exitCode = 1;
}
