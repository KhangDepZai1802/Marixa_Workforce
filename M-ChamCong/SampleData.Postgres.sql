/*
  SampleData.Postgres.sql - 6 user demo (PostgreSQL / Render)
  Login: SDT + Hovaten123@ (mat khau giu chung)
  Idempotent: chay nhieu lan khong loi.
*/

BEGIN;

-- ============================================================
-- Temp table: 6 staff
-- ============================================================
DROP TABLE IF EXISTS staff;
CREATE TEMP TABLE staff (
    "Seq" int, "EmployeeId" uuid, "EmployeeCode" text, "GivenName" text, "FamilyName" text,
    "PhoneNumber" text, "Email" text, "UserId" uuid, "RoleName" text, "DeptCode" text, "PositionCode" text
);

INSERT INTO staff VALUES
(1, 'C0000000-0000-0000-0000-000000000001', 'MX001', 'Đinh Văn',  'Tài',   '0900000001', 'dinhvan.tai@marixa.local',   'B0000000-0000-0000-0000-000000000001', 'Employee', 'ENG', 'STAFF'),
(2, 'C0000000-0000-0000-0000-000000000002', 'MX002', 'Phùng Vĩnh','Luân',  '0900000002', 'phungvinh.luan@marixa.local','B0000000-0000-0000-0000-000000000002', 'Employee', 'OPS', 'STAFF'),
(3, 'C0000000-0000-0000-0000-000000000003', 'MX003', 'Lê Anh',    'Khoa',  '0900000003', 'leanh.khoa@marixa.local',    'B0000000-0000-0000-0000-000000000003', 'HR',       'HR',  'HR'),
(4, 'C0000000-0000-0000-0000-000000000004', 'MX004', 'Trần Phụng','Tuyền','0900000004', 'tranphung.tuyen@marixa.local','B0000000-0000-0000-0000-000000000004', 'HR',       'HR',  'HR'),
(5, 'C0000000-0000-0000-0000-000000000005', 'MX005', 'Huỳnh Hoàng','Đăng', '0900000005', 'huynhhoang.dang@marixa.local','B0000000-0000-0000-0000-000000000005', 'Manager',  'OPS', 'MANAGER'),
(6, 'C0000000-0000-0000-0000-000000000006', 'MX006', 'Josept Đức','Tuấn', '0900000006', 'josept.ductuan@marixa.local', 'B0000000-0000-0000-0000-000000000006', 'Admin',    'OPS', 'ADMIN'),
(7, 'C0000000-0000-0000-0000-000000000007', 'MX007', 'Phạm Thị',  'Hương', '0900000007', 'phamthi.huong@marixa.local', 'B0000000-0000-0000-0000-000000000007', 'Accountant', 'ENG', 'ACCOUNTANT'),
(8, 'C0000000-0000-0000-0000-000000000008', 'MX008', 'Võ Minh',   'Tuấn',  '0900000008', 'vo.minhtuan@marixa.local',   'B0000000-0000-0000-0000-000000000008', 'Accountant', 'OPS', 'ACCOUNTANT'),
(9, 'C0000000-0000-0000-0000-000000000009', 'MX009', 'Nguyễn Hoàng','Quân', '0900000009', 'nguyenhoang.quan@marixa.local','B0000000-0000-0000-0000-000000000009', 'Employee',   'ENG', 'STAFF'),
(10,'C0000000-0000-0000-0000-000000000010', 'MX010', 'Lê Ngọc',   'An',    '0900000010', 'le.ngocan@marixa.local',     'B0000000-0000-0000-0000-000000000010', 'Employee',   'OPS', 'STAFF'),
(11,'C0000000-0000-0000-0000-000000000011', 'MX011', 'Trần Văn',  'Minh',  '0900000011', 'tranvas.minh@marixa.local',  'B0000000-0000-0000-0000-000000000011', 'Employee',   'HR',  'STAFF'),
(12,'C0000000-0000-0000-0000-000000000012', 'MX012', 'Đỗ Thị',    'Linh',  '0900000012', 'dothilinh@marixa.local',     'B0000000-0000-0000-0000-000000000012', 'Employee',   'ENG', 'STAFF'),
(13,'C0000000-0000-0000-0000-000000000013', 'MX013', 'Phan Anh',  'Đức',   '0900000013', 'phananh.duc@marixa.local',   'B0000000-0000-0000-0000-000000000013', 'Employee',   'OPS', 'STAFF'),
(14,'C0000000-0000-0000-0000-000000000014', 'MX014', 'Hoàng Minh','Thảo',  '0900000014', 'hoangminh.thao@marixa.local','B0000000-0000-0000-0000-000000000014', 'HR',         'HR',  'HR'),
(15,'C0000000-0000-0000-0000-000000000015', 'MX015', 'Bùi Quốc',  'Bảo',   '0900000015', 'buiquoc.bao@marixa.local',   'B0000000-0000-0000-0000-000000000015', 'Accountant', 'ENG', 'ACCOUNTANT'),
(16,'C0000000-0000-0000-0000-000000000016', 'MX016', 'Mai Lan',   'Phương','0900000016', 'mailan.phuong@marixa.local', 'B0000000-0000-0000-0000-000000000016', 'Employee',   'OPS', 'STAFF');

-- ============================================================
-- Xoa du lieu demo cu (chi 6 IDs)
-- ============================================================
DELETE FROM "AttendanceLogs"
WHERE "AttendanceId" IN (SELECT a."Id" FROM "Attendances" a WHERE a."EmployeeId" IN (SELECT "EmployeeId" FROM staff));

DELETE FROM "Attendances"    WHERE "EmployeeId" IN (SELECT "EmployeeId" FROM staff);
DELETE FROM "LeaveRequests"  WHERE "EmployeeId" IN (SELECT "EmployeeId" FROM staff);
DELETE FROM "EmployeeContracts"  WHERE "EmployeeId" IN (SELECT "EmployeeId" FROM staff);
DELETE FROM "EmployeeInsurances" WHERE "EmployeeId" IN (SELECT "EmployeeId" FROM staff);
DELETE FROM "EmployeeBankAccounts" WHERE "EmployeeId" IN (SELECT "EmployeeId" FROM staff);
DELETE FROM "EmployeeSalaries" WHERE "EmployeeId" IN (SELECT "EmployeeId" FROM staff);
DELETE FROM "EmployeeShifts"  WHERE "EmployeeId" IN (SELECT "EmployeeId" FROM staff);
DELETE FROM "Payrolls"        WHERE "EmployeeId" IN (SELECT "EmployeeId" FROM staff);
DELETE FROM "EmployeeDependents" WHERE "EmployeeId" IN (SELECT "EmployeeId" FROM staff);

-- NULL FK ( Employees.ManagerId, Employees.UserId, AspNetUsers.EmployeeId )
UPDATE "Departments" SET "ManagerId" = NULL WHERE "ManagerId" IN (SELECT "EmployeeId" FROM staff);
UPDATE "Employees"   SET "ManagerId" = NULL WHERE "ManagerId"  IN (SELECT "EmployeeId" FROM staff);
UPDATE "Employees"   SET "UserId"    = NULL WHERE "UserId"     IN (SELECT "UserId"     FROM staff);
UPDATE "AspNetUsers" SET "EmployeeId"= NULL WHERE "EmployeeId" IN (SELECT "EmployeeId" FROM staff);

-- Xoa link + bang (duyet tr uu tien)
DELETE FROM "AspNetUserRoles" WHERE "UserId" IN (SELECT "UserId" FROM staff);
DELETE FROM "Employees"       WHERE "Id"     IN (SELECT "EmployeeId" FROM staff);
DELETE FROM "AspNetUsers"     WHERE "Id"     IN (SELECT "UserId" FROM staff);

-- ============================================================
-- Bang nen (chi tao neu chua co)
-- ============================================================
INSERT INTO "AspNetRoles" ("Id","Name","NormalizedName","Description","CreatedTime","LastUpdatedTime","ConcurrencyStamp")
SELECT gen_random_uuid(), v."Name", UPPER(v."Name"), v."Dsc", NOW(), NOW(), gen_random_uuid()::text
FROM (VALUES
  ('Employee','Nhân viên'),
  ('Manager','Quản lý'),
  ('HR','Nhân sự'),
  ('Accountant','Kế toán'),
  ('Admin','Quản trị')
) v("Name","Dsc")
WHERE NOT EXISTS (SELECT 1 FROM "AspNetRoles" r WHERE r."NormalizedName" = UPPER(v."Name"));

INSERT INTO "Departments" ("Id","Code","Name","Description","ManagerId","IsActive","CreatedTime","LastUpdatedTime")
SELECT gen_random_uuid(), v."Code", v."Name", v."Dsc", NULL, TRUE, NOW(), NOW()
FROM (VALUES
  ('ENG','Kỹ thuật','Phát triển sản phẩm'),
  ('OPS','Vận hành','Vận hành nội bộ'),
  ('HR','Nhân sự','Quản lý nhân sự')
) v("Code","Name","Dsc")
WHERE NOT EXISTS (SELECT 1 FROM "Departments" d WHERE d."Code" = v."Code");

INSERT INTO "Positions" ("Id","Code","Name","Description","IsActive","CreatedTime","LastUpdatedTime")
SELECT gen_random_uuid(), v."Code", v."Name", v."Dsc", TRUE, NOW(), NOW()
FROM (VALUES
  ('STAFF','Nhân viên','Nhân viên'),
  ('MANAGER','Quản lý','Quản lý nhóm'),
  ('HR','Chuyên viên nhân sự','Nhân sự'),
  ('ACCOUNTANT','Kế toán','Kế toán'),
  ('ADMIN','Quản trị viên','Quản trị hệ thống')
) v("Code","Name","Dsc")
WHERE NOT EXISTS (SELECT 1 FROM "Positions" p WHERE p."Code" = v."Code");

INSERT INTO "Shifts" ("Id","Code","Name","Description","StartTime","EndTime","StandardHours","BreakMinutes","IsNight","WorkDays","IsActive","CreatedTime","LastUpdatedTime")
SELECT gen_random_uuid(), 'HC', 'Ca hành chính', 'T2-T6', TIME '08:00', TIME '17:00', 8, 60, FALSE, 31, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Shifts" s WHERE s."Code" = 'HC');

INSERT INTO "LeaveTypes" ("Id","Code","Name","MaxDays","IsPaid","IsActive","CreatedTime","LastUpdatedTime")
SELECT gen_random_uuid(), 'ANNUAL', 'Nghỉ phép năm', 12, TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "LeaveTypes" t WHERE t."Code" = 'ANNUAL');

INSERT INTO "Banks" ("Id","Code","Name","ShortName","IsActive","CreatedTime","LastUpdatedTime")
SELECT gen_random_uuid(), 'VCB', 'Ngân hàng TMCP Ngoại thương Việt Nam', 'Vietcombank', TRUE, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM "Banks" b WHERE b."Code" = 'VCB');

-- ============================================================
-- AspNetUsers (6 user)
-- ============================================================
INSERT INTO "AspNetUsers"
  ("Id","CreatedTime","LastUpdatedTime","UserName","NormalizedUserName","Email","NormalizedEmail","EmailConfirmed",
   "PasswordHash","SecurityStamp","ConcurrencyStamp","PhoneNumber","PhoneNumberConfirmed",
   "TwoFactorEnabled","LockoutEnabled","AccessFailedCount","LockoutEnd")
SELECT s."UserId", NOW(), NOW(), s."PhoneNumber", UPPER(s."PhoneNumber"), s."Email", UPPER(s."Email"), TRUE,
       'AQAAAAEAAYagAAAAEPRKUNrjqLaRkB4jKF2dOulTwaOc/7ksVVn++05ItTYObdf18SxZ17cGsNFXrDm20Q==',
       gen_random_uuid()::text, gen_random_uuid()::text, s."PhoneNumber", TRUE,
       FALSE, FALSE, 0, NULL
FROM staff s
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO "AspNetUserRoles" ("UserId","RoleId","CreatedTime","LastUpdatedTime")
SELECT s."UserId", r."Id", NOW(), NOW()
FROM staff s
JOIN "AspNetRoles" r ON r."NormalizedName" = UPPER(s."RoleName")
ON CONFLICT ("UserId","RoleId") DO NOTHING;

-- ============================================================
-- Employees (6)
-- ============================================================
INSERT INTO "Employees"
  ("Id","EmployeeCode","GivenName","FamilyName","Gender","PhoneNumber","Email","UserId","DepartmentId","PositionId","ManagerId",
   "StartDate","LaborType","Status","UsePhoneAttendance","CreatedTime","LastUpdatedTime")
SELECT s."EmployeeId", s."EmployeeCode", s."GivenName", s."FamilyName",
       CASE WHEN s."Seq" IN (3,4,6) THEN 2 ELSE 1 END,
       s."PhoneNumber", s."Email", s."UserId", d."Id", p."Id",
       'C0000000-0000-0000-0000-000000000005'::uuid,  -- Manager = Huynh Hoang Dang (seq 5)
       CURRENT_DATE - (s."Seq" * 30), 1, 2, TRUE, NOW(), NOW()
FROM staff s
JOIN "Departments" d ON d."Code" = s."DeptCode"
JOIN "Positions"   p ON p."Code" = s."PositionCode"
ON CONFLICT ("Id") DO NOTHING;

UPDATE "AspNetUsers" u SET "EmployeeId" = e."Id"
FROM "Employees" e
WHERE e."UserId" = u."Id" AND u."EmployeeId" IS NULL;

UPDATE "Departments" SET "ManagerId" = 'C0000000-0000-0000-0000-000000000005'::uuid WHERE "Code" IN ('ENG','OPS');
UPDATE "Departments" SET "ManagerId" = 'C0000000-0000-0000-0000-000000000003'::uuid WHERE "Code" = 'HR';

-- ============================================================
-- Du lieu con (6 nhan vien)
-- ============================================================
INSERT INTO "EmployeeContracts" ("Id","EmployeeId","ContractNumber","ContractType","StartDate","EndDate","Note","CreatedTime","LastUpdatedTime")
SELECT gen_random_uuid(), s."EmployeeId", 'HD-' || s."EmployeeCode", 2,
       CURRENT_DATE - 180, CURRENT_DATE + INTERVAL '1 year', 'Demo', NOW(), NOW()
FROM staff s
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO "EmployeeSalaries"
  ("Id","EmployeeId","PaymentType","BasicSalary","DailyRate","PositionAllowance","OtherAllowance","Bonus",
   "SocialInsuranceSalary","EffectiveFrom","CreatedTime","LastUpdatedTime")
SELECT gen_random_uuid(), s."EmployeeId", 1, 15000000, 0, 500000, 500000, 0, 12000000,
       CURRENT_DATE - 180, NOW(), NOW()
FROM staff s
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO "EmployeeBankAccounts" ("Id","EmployeeId","BankId","AccountNumber","AccountHolderName","IsPrimary","Status","CreatedTime","LastUpdatedTime")
SELECT gen_random_uuid(), s."EmployeeId", b."Id", '001234567' || LPAD(s."Seq"::text, 2, '0'),
       s."GivenName" || ' ' || s."FamilyName", TRUE, 1, NOW(), NOW()
FROM staff s
CROSS JOIN "Banks" b
WHERE b."Code" = 'VCB'
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO "Payrolls"
  ("Id","EmployeeId","PayrollMonth","BasicSalary","Allowance","Bonus","Overtime","Insurance","Tax","Deduction",
   "NetSalary","Status","PayDate","PaymentMethod","CreatedTime","LastUpdatedTime")
SELECT gen_random_uuid(), s."EmployeeId", DATE_TRUNC('month', NOW()), 15000000, 1000000, 500000, 0, 1200000, 300000, 0,
       15000000, CASE WHEN s."Seq" <= 3 THEN 2 ELSE 1 END, NULL, 2, NOW(), NOW()
FROM staff s
ON CONFLICT ("Id") DO NOTHING;

INSERT INTO "LeaveRequests"
  ("Id","EmployeeId","LeaveTypeId","FromDate","ToDate","TotalDays","Reason","Status","ApprovedBy","ApprovedAt","CreatedTime","LastUpdatedTime")
SELECT gen_random_uuid(), s."EmployeeId", t."Id",
       CURRENT_DATE + (5 + s."Seq") * INTERVAL '1 day',
       CURRENT_DATE + (5 + s."Seq") * INTERVAL '1 day',
       1, 'Don nghi phep demo', CASE WHEN s."Seq" <= 3 THEN 2 ELSE 1 END,
       CASE WHEN s."Seq" <= 3 THEN 'C0000000-0000-0000-0000-000000000005'::uuid ELSE NULL END,
       CASE WHEN s."Seq" <= 3 THEN NOW() ELSE NULL END, NOW(), NOW()
FROM staff s
CROSS JOIN "LeaveTypes" t
WHERE t."Code" = 'ANNUAL'
ON CONFLICT ("Id") DO NOTHING;

-- ============================================================
-- Attendances (5 ngay: 3 duyet + 2 cho) + Logs (vao/ra)
-- ============================================================
INSERT INTO "Attendances"
  ("Id","EmployeeId","AttendanceDate","Status","PlannedShiftId","PlannedHours","ActualHours",
   "ApprovalStatus","ApprovedBy","ApprovedAt","CreatedTime","LastUpdatedTime")
SELECT gen_random_uuid(), s."EmployeeId", (CURRENT_DATE - (i + 1))::timestamp, 1, sh."Id", 8, 8,
       CASE WHEN i < 3 THEN 1 ELSE 0 END,
       CASE WHEN i < 3 THEN 'C0000000-0000-0000-0000-000000000005'::uuid ELSE NULL END,
       CASE WHEN i < 3 THEN (CURRENT_DATE - (i + 1))::timestamp + INTERVAL '18 hours' ELSE NULL END,
       NOW(), NOW()
FROM generate_series(0, 4) AS i
JOIN staff s ON s."Seq" = ((i % 6) + 1)
CROSS JOIN "Shifts" sh
WHERE sh."Code" = 'HC';

INSERT INTO "AttendanceLogs" ("Id","AttendanceId","LogTime","Type","Method","DeviceId","IsAdjusted","CreatedTime","LastUpdatedTime")
SELECT gen_random_uuid(), a."Id", a."AttendanceDate" + INTERVAL '8 hours',  1, 4, 'DEMO-PHONE', FALSE, NOW(), NOW()
FROM "Attendances" a WHERE a."EmployeeId" IN (SELECT "EmployeeId" FROM staff)
UNION ALL
SELECT gen_random_uuid(), a."Id", a."AttendanceDate" + INTERVAL '17 hours', 2, 4, 'DEMO-PHONE', FALSE, NOW(), NOW()
FROM "Attendances" a WHERE a."EmployeeId" IN (SELECT "EmployeeId" FROM staff);

DROP TABLE IF EXISTS staff;
COMMIT;

SELECT 'DA SEED: 6 user demo (SDT + Hovaten123@). 5 ngay cong, 6 le phi, 6 luong, 6 hop dong.' AS result;
