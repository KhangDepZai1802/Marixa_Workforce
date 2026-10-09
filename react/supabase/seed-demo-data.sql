-- ============================================================
-- SEED: Dữ lieu khoi tao Marixa Cham Cong (Supabase test)
-- Chay trong Supabase Dashboard > SQL Editor (project: lasdnfytejntonjfkspv)
--
-- TAI KHOAN — mat khau chung:  "Hovaten123@"
-- He thong login theo SO DIEN THOAI (tra tim employees theo phone,
-- sau do goi Supabase Auth bang work_email). Vai (role) he thong
-- chi co 3 loai: employee / hr / admin.
--
--   SOT          HO TEN                  ROLE
--   0900000001   Dinh Van Tai           employee
--   0900000002   Phung Vinh Luan        employee
--   0900000003   Le Anh Khoa            hr
--   0900000004   Tran Phuung Tuyen      hr
--   0900000005   Huynh Hoang Dang      hr
--   0900000006   Josep Duc Tuan        admin
--   0900000007   Vu Minh Anh         employee
--   0900000008   Tran Ngoc Bao       employee
--
-- admin + hr + quan ly: lan dau BUC DOI MAT KHAU (/change-password).
-- nhan vien + ke toan: vao thang /today.
--
-- Cach chay: dan TOAN BO vao SQL Editor > Run (1 lan, idempotent).
-- Neu tao user Auth bi loi (do version), tuong duoc tao trong
-- Dashboard > Authentication > Users > Add user, sau do CHAY LAI
-- seed nay: no se link app_users theo email mat (khong tao lung).
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Nhan vien (employees)
-- ------------------------------------------------------------
insert into public.employees (employee_code, full_name, work_email, phone, department, job_title, hire_date, status)
values
  ('EMP-001', 'Đinh Văn Tài',      'dinhvantai@marixa.local',     '0900000001', 'Vận hành',             'Nhân viên',              '2025-02-03', 'active'),
  ('EMP-002', 'Phùng Vĩnh Luân',     'phungvinhluan@marixa.local', '0900000002', 'Vận hành',             'Nhân viên',              '2025-02-03', 'active'),
  ('EMP-003', 'Lê Anh Khoa',         'leanhkhoa@marixa.local',      '0900000003', 'Nhân sự',              'Chuyên viên HR',         '2025-01-06', 'active'),
  ('EMP-004', 'Trần Phiụng Tuyển',    'tranphungtuyen@marixa.local', '0900000004', 'Nhân sự',              'Chuyên viên HR',         '2025-01-06', 'active'),
  ('EMP-005', 'Huỳnh Hoàng Đăng',     'huynhhoangdang@marixa.local', '0900000005', 'Quản trị',             'Quản lý',                '2024-08-01', 'active'),
  ('EMP-006', 'Josep Đực Tuấn',    'joseptuan@marixa.local',      '0900000006', 'Quản trị',             'System Administrator',   '2024-08-01', 'active'),
  ('EMP-007', 'Vũ Minh Anh',         'vuminhanh@marixa.local',      '0900000007', 'Tài chính - Kế toán',  'Kế toán',                '2025-03-10', 'active'),
  ('EMP-008', 'Trần Ngọc Bảo',       'tranngocbao@marixa.local',    '0900000008', 'Tài chính - Kế toán',  'Kế toán',                '2025-03-10', 'active')
on conflict (employee_code) do update set
  full_name = excluded.full_name, work_email = excluded.work_email, phone = excluded.phone,
  department = excluded.department, job_title = excluded.job_title, hire_date = excluded.hire_date,
  status = excluded.status;

-- ------------------------------------------------------------
-- 2. Tao Auth user (neu chua co) + link app_users theo email (mat)
--    Mat khau chung: 'Hovaten123@'
-- ------------------------------------------------------------
do $$
declare
  rec record;
  v_emp public.employees%rowtype;
begin
  for rec in
    select * from (
      values
        ('EMP-001', 'dinhvantai@marixa.local',     'Hovaten123@', 'employee', false),
        ('EMP-002', 'phungvinhluan@marixa.local',  'Hovaten123@', 'employee', false),
        ('EMP-003', 'leanhkhoa@marixa.local',       'Hovaten123@', 'hr',       true),
        ('EMP-004', 'tranphungtuyen@marixa.local',  'Hovaten123@', 'hr',       true),
        ('EMP-005', 'huynhhoangdang@marixa.local',  'Hovaten123@', 'hr',       true),
        ('EMP-006', 'joseptuan@marixa.local',       'Hovaten123@', 'admin',    true),
        ('EMP-007', 'vuminhanh@marixa.local',       'Hovaten123@', 'employee', false),
        ('EMP-008', 'tranngocbao@marixa.local',     'Hovaten123@', 'employee', false)
    ) as t(code text, email text, pw text, role text, change boolean)
  loop
    -- 2.1 Chi tao Auth user neu chua co; loi chi la thong bao, khong ngat seed
    if not exists (select 1 from auth.users where email = rec.email) then
      begin
        perform auth.admin_create_user(
          jsonb_build_object('email', rec.email, 'password', rec.pw),
          true
        );
      exception
        when duplicate_key then null;
        when others then
          raise notice 'Tao Auth user % that bai (%). Tuong trong Dashboard > Authentication > Users, roi chay lai seed.', rec.email, sqlerrm;
      end;
    end if;

    -- 2.2 Lay dong employees tuong ung
    select * into v_emp from public.employees where employee_code = rec.code;
    if not found then
      raise notice 'employees chua co dong % (chay lan 1 truoc truong nay).', rec.code;
    end if;

    -- 2.3 Link app_users theo email (mat voi version)
    insert into public.app_users (auth_user_id, employee_id, role, status, must_change_password)
    select u.id, v_emp.id, rec.role, 'active', rec.change
    from auth.users u
    where u.email = rec.email
    on conflict (auth_user_id) do update set
      employee_id = excluded.employee_id,
      role = excluded.role,
      status = 'active',
      must_change_password = excluded.must_change_password;
  end loop;
end
$$;

-- ------------------------------------------------------------
-- 3. Loai nghi phep mac dinh (ANNUAL = phep nam, 12 ngay/nam)
-- ------------------------------------------------------------
insert into public.leave_types (code, name, deducts_annual_balance, active)
values
  ('ANNUAL', 'Phép năm',         true,  true),
  ('SICK',   'Nghỉ ốm',          false, true),
  ('UNPAID', 'Nghỉ không lương', false, true)
on conflict (code) do update set
  name = excluded.name, deducts_annual_balance = excluded.deducts_annual_balance, active = excluded.active;

-- ------------------------------------------------------------
-- 4. Chinh sach lam viec mac dinh (08:00–17:00, nghi 12:00–13:00)
-- ------------------------------------------------------------
insert into public.work_policies (effective_from, timezone, start_time, lunch_start, lunch_end, end_time, working_weekdays, late_grace_minutes, photo_retention_days)
select current_date, 'Asia/Ho_Chi_Minh', '08:00', '12:00', '13:00', '17:00', array[1,2,3,4,5,6], 0, 90
where not exists (select 1 from public.work_policies limit 1);

commit;

-- ------------------------------------------------------------
-- Kiem tra nhanh (danh sach tai khoan da link)
-- ------------------------------------------------------------
select e.employee_code, e.full_name, e.phone, au.role, au.status, au.must_change_password
from public.employees e
left join public.app_users au on au.employee_id = e.id
order by e.employee_code;
