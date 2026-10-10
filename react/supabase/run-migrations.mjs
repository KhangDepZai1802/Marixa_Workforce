#!/usr/bin/env node
// ============================================================================
// run-migrations.mjs — Chạy TOÀN BỘ schema + seed + auth users trên Supabase
//
// Cách dùng (trong thư mục react/):
//   node supabase/run-migrations.mjs "postgresql://postgres:MAT_KHAU@db.pkpwcpatuslfjyoivbuf.supabase.co:5432/postgres"
//
// Lấy connection string: Supabase Dashboard > Database > Connection string
// > "Direct connection string" (session pooler OFF) — thay [YOUR-PASSWORD]
// bằng mật khẩu database thật.
//
// Script thực hiện:
//   0. RESET: drop schema public (kể cả storage policies tham chiếu) + tạo lại
//   1. Chạy 12 file migrations (thứ tự, mỗi file 1 transaction)
//   2. Seed: 8 employees, leave_types, work_policies
//   3. Tạo 8 user Auth qua GoTrue admin API (service key) + link app_users
// ============================================================================
import pg from 'pg';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbUrl = process.argv[2];
if (!dbUrl) {
  console.error('Cach dung: node supabase/run-migrations.mjs "postgresql://postgres:MAT_KHAU@db....:5432/postgres"');
  console.error('Lay connection string: Supabase Dashboard > Database > Connection string > Direct (thay [YOUR-PASSWORD] bang mat khau DB).');
  process.exit(1);
}

// Legacy bootstrap resets the whole public schema. Keep it unusable for an
// accidental invocation or a production/pooler connection. Normal migration
// verification uses verify-phase2.mjs and never calls this script.
let databaseHost;
try {
  databaseHost = new URL(dbUrl).hostname;
} catch {
  console.error('Connection string khong hop le.');
  process.exit(1);
}
if (databaseHost !== 'db.pkpwcpatuslfjyoivbuf.supabase.co' ||
    process.env.MARIXA_ALLOW_TEST_RESET !== 'pkpwcpatuslfjyoivbuf') {
  console.error('Tu choi reset: chi cho phep Direct connection cua project test va can xac nhan MARIXA_ALLOW_TEST_RESET.');
  process.exit(1);
}

// --- Doc secret key: uu tien argv[3], sau do moi .env.local -----------------
const envLocalPath = path.join(__dirname, '..', '.env.local');
let SERVICE_KEY = '';
if (process.argv[3]) {
  SERVICE_KEY = process.argv[3].trim();
} else {
  try {
    const envLocal = readFileSync(envLocalPath, 'utf8');
    const line = envLocal.split('\n').find(l => l.startsWith('SUPABASE_SECRET_KEY='));
    SERVICE_KEY = line ? line.split('=').slice(1).join('=').trim() : '';
  } catch { /* .env.local khong ton tai */ }
}
if (!SERVICE_KEY || SERVICE_KEY === '***' || SERVICE_KEY.length < 20) {
  console.error('Thieu SUPABASE_SECRET_KEY hop le.');
  console.error('Chuan: node supabase/run-migrations.mjs "postgresql://..." "sb_secret_..."');
  process.exit(1);
}

const SUPABASE_URL = 'https://pkpwcpatuslfjyoivbuf.supabase.co';

// --- Danh sach tai khoan (mat khau chung) -----------------------------------
const PASSWORD = 'Hovaten123@';
const ACCOUNTS = [
  { code: 'EMP-001', email: 'dinhvantai@marixa.local',     phone: '0900000001', role: 'employee', mustChange: false },
  { code: 'EMP-002', email: 'phungvinhluan@marixa.local',  phone: '0900000002', role: 'employee', mustChange: false },
  { code: 'EMP-003', email: 'leanhkhoa@marixa.local',      phone: '0900000003', role: 'hr',       mustChange: true  },
  { code: 'EMP-004', email: 'tranphungtuyen@marixa.local', phone: '0900000004', role: 'hr',       mustChange: true  },
  { code: 'EMP-005', email: 'huynhhoangdang@marixa.local', phone: '0900000005', role: 'hr',       mustChange: true  },
  { code: 'EMP-006', email: 'joseptuan@marixa.local',      phone: '0900000006', role: 'admin',    mustChange: true  },
  { code: 'EMP-007', email: 'vuminhanh@marixa.local',      phone: '0900000007', role: 'employee', mustChange: false },
  { code: 'EMP-008', email: 'tranngocbao@marixa.local',    phone: '0900000008', role: 'employee', mustChange: false },
];

const RESET_SQL = `
do $$
declare r record;
begin
  for r in
    select p.policyname
    from pg_policies p
    where p.schemaname = 'storage' and p.tablename = 'objects'
  loop
    execute 'drop policy if exists ' || quote_ident(r.policyname) || ' on storage.objects';
  end loop;
end
$$;

drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres;
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;
`;

const SEED_SQL = `
insert into public.employees (employee_code, full_name, work_email, phone, department, job_title, hire_date, status)
values
  ('EMP-001', 'Đinh Văn Tài',       'dinhvantai@marixa.local',     '0900000001', 'Vận hành',            'Nhân viên',              '2025-02-03', 'active'),
  ('EMP-002', 'Phùng Vĩnh Luân',     'phungvinhluan@marixa.local',  '0900000002', 'Vận hành',            'Nhân viên',              '2025-02-03', 'active'),
  ('EMP-003', 'Lê Anh Khoa',         'leanhkhoa@marixa.local',      '0900000003', 'Nhân sự',             'Chuyên viên HR',         '2025-01-06', 'active'),
  ('EMP-004', 'Trần Phiụng Tuyển',   'tranphungtuyen@marixa.local',  '0900000004', 'Nhân sự',             'Chuyên viên HR',         '2025-01-06', 'active'),
  ('EMP-005', 'Huỳnh Hoàng Đăng',    'huynhhoangdang@marixa.local', '0900000005', 'Quản trị',            'Quản lý',                '2024-08-01', 'active'),
  ('EMP-006', 'Josep Đực Tuấn',   'joseptuan@marixa.local',      '0900000006', 'Quản trị',            'System Administrator',   '2024-08-01', 'active'),
  ('EMP-007', 'Vũ Minh Anh',         'vuminhanh@marixa.local',      '0900000007', 'Tài chính - Kế toán', 'Kế toán',                '2025-03-10', 'active'),
  ('EMP-008', 'Trần Ngọc Bảo',       'tranngocbao@marixa.local',    '0900000008', 'Tài chính - Kế toán', 'Kế toán',                '2025-03-10', 'active')
on conflict (employee_code) do nothing;

insert into public.leave_types (code, name, deducts_annual_balance, active)
values
  ('ANNUAL', 'Phép năm',         true,  true),
  ('SICK',   'Nghỉ ốm',          false, true),
  ('UNPAID', 'Nghỉ không lương', false, true)
on conflict (code) do update set name = excluded.name, deducts_annual_balance = excluded.deducts_annual_balance, active = excluded.active;

insert into public.work_policies (effective_from, timezone, start_time, lunch_start, lunch_end, end_time, working_weekdays, late_grace_minutes, photo_retention_days)
select current_date, 'Asia/Ho_Chi_Minh', '08:00', '12:00', '13:00', '17:00', array[1,2,3,4,5,6], 0, 90
where not exists (select 1 from public.work_policies limit 1);
`;

// --- GoTrue admin API ---------------------------------------------------------
async function goTrue(method, pathname, body) {
  const maxRetries = 3;
  let lastErr = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(`${SUPABASE_URL}${pathname}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SERVICE_KEY}`,
          'apikey': SERVICE_KEY,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch { /* not json */ }
      if (res.ok) return { ok: true, status: res.status, json, text };
      // 401/403 — key có thể chưa propagate, wait & retry
      if (res.status === 401 || res.status === 403) {
        lastErr = `HTTP ${res.status} on ${method} ${pathname}`;
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }
        return { ok: false, status: res.status, json, text };
      }
      return { ok: false, status: res.status, json, text };
    } catch (e) {
      lastErr = e.message;
      if (attempt < maxRetries - 1) await new Promise(r => setTimeout(r, 2000));
    }
  }
  throw new Error(`GoTrue API sau ${maxRetries} lần thử vẫn lỗi: ${lastErr}`);
}

async function getOrCreateAuthUser(email) {
  const created = await goTrue('POST', '/auth/v1/admin/users', { email, password: PASSWORD, email_confirm: true });
  if (created.ok && created.json?.id) return { id: created.json.id, email };
  const isDuplicate = created.status === 409 || (created.status === 422 && created.json?.error_code === 'email_exists');
  if (isDuplicate) {
    // Da ton tai — tim id
    const page = await goTrue('GET', '/auth/v1/admin/users');
    const users = page.json?.users ?? [];
    const found = users.find(u => u.email === email);
    if (found) return { id: found.id, email };
  }
  throw new Error(`Tao tim Auth user ${email} that bai (HTTP ${created.status}): ${created.text.slice(0, 300)}`);
}

// --- Chu thuc hien -------------------------------------------------------------
async function main() {
  const pool = new pg.Pool({ connectionString: dbUrl });
  const client = await pool.connect();
  client.query('set statement_timeout = 0');

  const step = (n, label) => console.log(`\n[${n}/6] ${label} ...`);

  step(0, 'RESET public schema (xoa data test cu + storage policies tham chieu)');
  await client.query('BEGIN');
  await client.query(RESET_SQL);
  await client.query('COMMIT');
  console.log('        Done.');

  step(1, 'Chay 12 migrations (moi file 1 transaction)');
  const migDir = path.join(__dirname, 'migrations');
  const fs = await import('node:fs');
  const migFiles = fs.readdirSync(migDir)
    .filter(f => /^\d{12}_.*\.sql$/.test(f))
    .sort();
  if (migFiles.length === 0) {
    throw new Error('Khong tim thay file migration nao trong /migrations (regex ^\\d{12}_*.sql$).');
  }
  for (const f of migFiles) {
    let sql = fs.readFileSync(path.join(migDir, f), 'utf8').replace(/^\uFEFF/, '');
    const checksum = createHash('sha256').update(sql).digest('hex').slice(0, 16);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        `insert into public.app_schema_migrations(version, checksum)
         values ($1, $2)
         on conflict (version) do update set checksum = excluded.checksum, applied_at = now()`,
        [f, checksum],
      );
      await client.query('COMMIT');
      console.log(`        OK ${f}`);
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw new Error(`Migration ${f} that bai: ${err.message}`);
    }
  }

  step(2, 'Seed: 8 employees + leave_types + work_policies');
  await client.query('BEGIN');
  await client.query(SEED_SQL);
  await client.query('COMMIT');
  console.log('        Done.');

  step(3, 'Tao 8 Auth user (GoTrue admin API)');
  for (const a of ACCOUNTS) {
    const u = await getOrCreateAuthUser(a.email);
    console.log(`        ${a.code}  ${a.email}  -> ${u.id}`);
  }

  step(4, 'Link app_users (role + must_change_password)');
  for (const a of ACCOUNTS) {
    const u = await getOrCreateAuthUser(a.email);
    const emp = await client.query(
      'select id from public.employees where employee_code = $1', [a.code],
    );
    const empId = emp.rows[0]?.id;
    if (!empId) throw new Error(`Khong tim thay employees ${a.code}`);
    await client.query(
      `insert into public.app_users (auth_user_id, employee_id, role, status, must_change_password)
       values ($1, $2, $3, 'active', $4)
       on conflict (auth_user_id) do update set
         employee_id = excluded.employee_id,
         role = excluded.role,
         status = 'active',
         must_change_password = excluded.must_change_password`,
      [u.id, empId, a.role, a.mustChange],
    );
    console.log(`        ${a.code} ${a.phone}  role=${a.role}  mustChange=${a.mustChange}`);
  }

  step(5, 'Kiem tra nhanh');
  const summary = await client.query(
    `select e.employee_code, e.full_name, e.phone, au.role, au.status, au.must_change_password
     from public.employees e
     left join public.app_users au on au.employee_id = e.id
     order by e.employee_code`,
  );
  console.table(summary.rows);

  await pool.end();
  console.log('\n============================================================');
  console.log('HOAN TAT! Tai khoan (mat khau chung: ' + PASSWORD + ')');
  console.log('  0900000001 Ding Van Tai   employee');
  console.log('  0900000002 Phung Vinh Luan employee');
  console.log('  0900000003 Le Anh Khoa    hr      (buoc doi mat khau lan dau)');
  console.log('  0900000004 Tran Phuung Tuyen   hr      (buoc doi mat khau lan dau)');
  console.log('  0900000005 Huynh Hoang Dang   hr      (buoc doi mat khau lan dau)');
  console.log('  0900000006 Josep Duc Tuan admin    (buoc doi mat khau lan dau)');
  console.log('  0900000007 Vu Minh Anh    employee');
  console.log('  0900000008 Tran Ngoc Bao  employee');
  console.log('Chay: npm run dev -> http://localhost:3000/login');
  console.log('============================================================');
}

main().catch(err => {
  console.error('\nLOI: ' + err.message);
  process.exit(1);
});
