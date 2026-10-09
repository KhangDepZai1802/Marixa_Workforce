/*
  SampleData.sql - 6 user demo (SQL Server / Somee monica_001)
  Login: SDT + Hovaten123@ (mat khau giu chung)
  Idempotent: chay nhieu lan chi reset 6 demo IDs nay.
nanana
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

BEGIN TRANSACTION;

DECLARE @now datetimeoffset = SYSDATETIMEOFFSET();
DECLARE @today date = CONVERT(date, GETDATE());
DECLARE @passwordHash nvarchar(max) = N'AQAAAAEAAYagAAAAEPRKUNrjqLaRkB4jKF2dOulTwaOc/7ksVVn++05ItTYObdf18SxZ17cGsNFXrDm20Q==';
DECLARE @mgrEmp uniqueidentifier = N'C0000000-0000-0000-0000-000000000005'; -- Manager = Huynh Hoang Dang (seq5)
DECLARE @hrEmp  uniqueidentifier = N'C0000000-0000-0000-0000-000000000003'; -- HR = Le Anh Khoa (seq3)

DECLARE @staff TABLE
(
    Seq int PRIMARY KEY,
    EmployeeId uniqueidentifier NOT NULL,
    UserId     uniqueidentifier NOT NULL,
    EmployeeCode nvarchar(50) NOT NULL,
    GivenName nvarchar(100) NOT NULL,
    FamilyName nvarchar(100) NOT NULL,
    PhoneNumber nvarchar(20) NOT NULL,
    Email nvarchar(256) NOT NULL,
    RoleName nvarchar(256) NOT NULL,
    DeptCode nvarchar(50) NOT NULL,
    PositionCode nvarchar(50) NOT NULL
);

INSERT INTO @staff VALUES
(1, CAST('C0000000-0000-0000-0000-000000000001' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000001' AS uniqueidentifier), 'MX001',N'Dinh Van',   N'Tai',  '0900000001',N'dinhvan.tai@marixa.local',   N'Employee', N'ENG', N'STAFF'),
(2, CAST('C0000000-0000-0000-0000-000000000002' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000002' AS uniqueidentifier), 'MX002',N'Phung Vinh', N'Luân', '0900000002',N'phungvinh.luan@marixa.local',N'Employee', N'OPS', N'STAFF'),
(3, CAST('C0000000-0000-0000-0000-000000000003' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000003' AS uniqueidentifier), 'MX003',N'Le Anh',     N'Khoa', '0900000003',N'leanh.khoa@marixa.local',    N'HR',       N'HR',  N'HR'),
(4, CAST('C0000000-0000-0000-0000-000000000004' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000004' AS uniqueidentifier), 'MX004',N'Tran Phung', N'Tuyen','0900000004',N'tranphung.tuyen@marixa.local',N'HR',       N'HR',  N'HR'),
(5, CAST('C0000000-0000-0000-0000-000000000005' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000005' AS uniqueidentifier), 'MX005',N'Huynh Hoang',N'Dang','0900000005',N'huynhhoang.dang@marixa.local', N'Manager',  N'OPS', N'MANAGER'),
(6, CAST('C0000000-0000-0000-0000-000000000006' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000006' AS uniqueidentifier), 'MX006',N'Josept Duc', N'Tuan', '0900000006',N'josept.ductuan@marixa.local', N'Admin',    N'OPS', N'ADMIN'),
(7, CAST('C0000000-0000-0000-0000-000000000007' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000007' AS uniqueidentifier), 'MX007',N'Pham Thi',   N'Hương','0900000007',N'phamthi.huong@marixa.local', N'Accountant', N'ENG', N'ACCOUNTANT'),
(8, CAST('C0000000-0000-0000-0000-000000000008' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000008' AS uniqueidentifier), 'MX008',N'Vo Minh',    N'Tuấn', '0900000008',N'vo.minhtuan@marixa.local',   N'Accountant', N'OPS', N'ACCOUNTANT'),
(9, CAST('C0000000-0000-0000-0000-000000000009' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000009' AS uniqueidentifier), 'MX009',N'Nguyen Hoang',N'Quân','0900000009',N'nguyenhoang.quan@marixa.local',N'Employee', N'ENG', N'STAFF'),
(10,CAST('C0000000-0000-0000-0000-000000000010' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000010' AS uniqueidentifier), 'MX010',N'Le Ngoc',    N'An',   '0900000010',N'le.ngocan@marixa.local',      N'Employee', N'OPS', N'STAFF'),
(11,CAST('C0000000-0000-0000-0000-000000000011' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000011' AS uniqueidentifier), 'MX011',N'Tran Van',   N'Minh', '0900000011',N'tranvan.minh@marixa.local',  N'Employee', N'HR',  N'STAFF'),
(12,CAST('C0000000-0000-0000-0000-000000000012' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000012' AS uniqueidentifier), 'MX012',N'Do Thi',     N'Linh', '0900000012',N'dothilinh@marixa.local',      N'Employee', N'ENG', N'STAFF'),
(13,CAST('C0000000-0000-0000-0000-000000000013' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000013' AS uniqueidentifier), 'MX013',N'Phan Anh',   N'Duc',  '0900000013',N'phananh.duc@marixa.local',   N'Employee', N'OPS', N'STAFF'),
(14,CAST('C0000000-0000-0000-0000-000000000014' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000014' AS uniqueidentifier), 'MX014',N'Hoang Minh',N'Thao', '0900000014',N'hoangminh.thao@marixa.local',N'HR',       N'HR',  N'HR'),
(15,CAST('C0000000-0000-0000-0000-000000000015' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000015' AS uniqueidentifier), 'MX015',N'Bui Quoc',   N'Bao',  '0900000015',N'buiquoc.bao@marixa.local',   N'Accountant', N'ENG', N'ACCOUNTANT'),
(16,CAST('C0000000-0000-0000-0000-000000000016' AS uniqueidentifier), CAST('B0000000-0000-0000-0000-000000000016' AS uniqueidentifier), 'MX016',N'Mai Lan',    N'Phuong','0900000016',N'mailan.phuong@marixa.local', N'Employee', N'OPS', N'STAFF');
DECLARE @empIds TABLE (Id uniqueidentifier PRIMARY KEY);
INSERT INTO @empIds SELECT EmployeeId FROM @staff;

/* ---- Xoa du lieu demo cu (idempotent) ---- */
DELETE l FROM dbo.AttendanceLogs l
JOIN dbo.Attendances a ON a.Id = l.AttendanceId
WHERE a.EmployeeId IN (SELECT Id FROM @empIds);

DELETE FROM dbo.Attendances          WHERE EmployeeId IN (SELECT Id FROM @empIds);
DELETE FROM dbo.LeaveRequests        WHERE EmployeeId IN (SELECT Id FROM @empIds);
DELETE FROM dbo.EmployeeContracts    WHERE EmployeeId IN (SELECT Id FROM @empIds);
DELETE FROM dbo.EmployeeInsurances   WHERE EmployeeId IN (SELECT Id FROM @empIds);
DELETE FROM dbo.EmployeeBankAccounts WHERE EmployeeId IN (SELECT Id FROM @empIds);
DELETE FROM dbo.EmployeeSalaries     WHERE EmployeeId IN (SELECT Id FROM @empIds);
DELETE FROM dbo.EmployeeShifts       WHERE EmployeeId IN (SELECT Id FROM @empIds);
DELETE FROM dbo.Payrolls             WHERE EmployeeId IN (SELECT Id FROM @empIds);
DELETE FROM dbo.EmployeeDependents   WHERE EmployeeId IN (SELECT Id FROM @empIds);

UPDATE dbo.Departments SET ManagerId = NULL WHERE ManagerId IN (SELECT Id FROM @empIds);
UPDATE dbo.Employees   SET ManagerId = NULL WHERE ManagerId  IN (SELECT Id FROM @empIds);
UPDATE dbo.Employees   SET UserId    = NULL WHERE Id IN (SELECT Id FROM @empIds);
UPDATE dbo.AspNetUsers SET EmployeeId= NULL WHERE EmployeeId IN (SELECT Id FROM @empIds);

DELETE FROM dbo.Employees       WHERE Id IN (SELECT Id FROM @empIds);
DELETE FROM dbo.AspNetUserRoles WHERE UserId IN (SELECT UserId FROM @staff);
DELETE FROM dbo.AspNetUsers     WHERE Id IN (SELECT UserId FROM @staff);

/* ---- Bang nen (chi tao neu chua co) ---- */
DECLARE @roles TABLE (RoleName nvarchar(256), Description nvarchar(max));
INSERT INTO @roles VALUES
(N'Employee',N'Nhân viên'),(N'Manager',N'Quản lý'),(N'HR',N'Nhân sự'),
(N'Accountant',N'Kế toán'),(N'Admin',N'Quản trị hệ thống');

INSERT INTO dbo.AspNetRoles (Id,Name,NormalizedName,Description,CreatedTime,LastUpdatedTime,ConcurrencyStamp)
SELECT NEWID(), r.RoleName, UPPER(r.RoleName), r.Description, @now, @now, CONVERT(nvarchar(36),NEWID())
FROM @roles r
WHERE NOT EXISTS (SELECT 1 FROM dbo.AspNetRoles x WHERE x.NormalizedName = UPPER(r.RoleName));

INSERT INTO dbo.Departments (Id,Code,Name,Description,ManagerId,IsActive,CreatedTime,LastUpdatedTime)
SELECT NEWID(), v.Code, v.Name, v.Description, NULL, 1, @now, @now
FROM (VALUES (N'ENG',N'Kỹ thuật',N'Phát triển sản phẩm'),
              (N'OPS',N'Vận hành',N'Vận hành nội bộ'),
              (N'HR', N'Nhân sự',  N'Quản lý nhân sự')) v(Code,Name,Description)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Departments d WHERE d.Code = v.Code);

INSERT INTO dbo.Positions (Id,Code,Name,Description,IsActive,CreatedTime,LastUpdatedTime)
SELECT NEWID(), v.Code, v.Name, v.Description, 1, @now, @now
FROM (VALUES (N'STAFF',N'Nhân viên',N'Nhân viên'),
              (N'MANAGER',N'Quản lý',N'Quản lý nhóm'),
              (N'HR',N'Chuyên viên nhân sự',N'Nhân sự'),
              (N'ACCOUNTANT',N'Kế toán',N'Kế toán'),
              (N'ADMIN',N'Quản trị viên',N'Quản trị hệ thống')) v(Code,Name,Description)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Positions p WHERE p.Code = v.Code);

INSERT INTO dbo.Shifts (Id,Code,Name,Description,StartTime,EndTime,StandardHours,BreakMinutes,IsNight,WorkDays,IsActive,CreatedTime,LastUpdatedTime)
SELECT NEWID(), N'HC', N'Ca hành chính', N'Thứ 2 đến thứ 6', CAST('08:00' AS time), CAST('17:00' AS time), 8, 60, 0, 31, 1, @now, @now
WHERE NOT EXISTS (SELECT 1 FROM dbo.Shifts s WHERE s.Code = N'HC');

INSERT INTO dbo.LeaveTypes (Id,Code,Name,MaxDays,IsPaid,IsActive,CreatedTime,LastUpdatedTime)
SELECT NEWID(), N'ANNUAL', N'Nghỉ phép năm', 12, 1, 1, @now, @now
WHERE NOT EXISTS (SELECT 1 FROM dbo.LeaveTypes t WHERE t.Code = N'ANNUAL');

INSERT INTO dbo.Banks (Id,Code,Name,ShortName,IsActive,CreatedTime,LastUpdatedTime)
SELECT NEWID(), N'VCB', N'Ngân hàng TMCP Ngoại thương Việt Nam', N'Vietcombank', 1, @now, @now
WHERE NOT EXISTS (SELECT 1 FROM dbo.Banks b WHERE b.Code = N'VCB');

/* ---- 6 user + vai troi ---- */
INSERT INTO dbo.AspNetUsers
    (Id,UserName,NormalizedUserName,Email,NormalizedEmail,EmailConfirmed,
     PasswordHash,SecurityStamp,ConcurrencyStamp,PhoneNumber,PhoneNumberConfirmed,
     TwoFactorEnabled,LockoutEnabled,AccessFailedCount,CreatedTime,LastUpdatedTime)
SELECT s.UserId, s.PhoneNumber, UPPER(s.PhoneNumber), s.Email, UPPER(s.Email), 1,
       @passwordHash, CONVERT(nvarchar(36),NEWID()), CONVERT(nvarchar(36),NEWID()), s.PhoneNumber, 1,
       0, 0, 0, @now, @now
FROM @staff s;

INSERT INTO dbo.AspNetUserRoles (UserId,RoleId,CreatedTime,LastUpdatedTime)
SELECT s.UserId, r.Id, @now, @now
FROM @staff s
JOIN dbo.AspNetRoles r ON r.NormalizedName = UPPER(s.RoleName);

/* ---- 6 nhan vien ---- */
INSERT INTO dbo.Employees
    (Id,EmployeeCode,GivenName,FamilyName,Gender,PhoneNumber,Email,UserId,DepartmentId,PositionId,ManagerId,
     StartDate,LaborType,Status,UsePhoneAttendance,CreatedTime,LastUpdatedTime)
SELECT s.EmployeeId, s.EmployeeCode, s.GivenName, s.FamilyName,
       CASE WHEN s.Seq IN (3,4,6) THEN 2 ELSE 1 END,
       s.PhoneNumber, s.Email, s.UserId, d.Id, p.Id,
       CASE WHEN s.Seq = 5 OR s.Seq = 3 THEN NULL ELSE @mgrEmp END,
       DATEADD(day,-(s.Seq*30),@today), 1, 2, 1, @now, @now
FROM @staff s
JOIN dbo.Departments d ON d.Code = s.DeptCode
JOIN dbo.Positions p ON p.Code = s.PositionCode;

UPDATE dbo.AspNetUsers SET EmployeeId = s.EmployeeId
FROM dbo.AspNetUsers u
JOIN @staff s ON u.Id = s.UserId;

UPDATE dbo.Departments SET ManagerId = @mgrEmp WHERE Code IN (N'ENG',N'OPS');
UPDATE dbo.Departments SET ManagerId = @hrEmp  WHERE Code = N'HR';

/* ---- Du lieu con (6 nhan vien) ---- */
INSERT INTO dbo.EmployeeContracts (Id,EmployeeId,ContractNumber,ContractType,StartDate,EndDate,Note,CreatedTime,LastUpdatedTime)
SELECT NEWID(), s.EmployeeId, CONCAT(N'HĐ-',s.EmployeeCode), 2, DATEADD(day,-180,@today), DATEADD(year,1,@today), N'Dữ liệu demo', @now, @now
FROM @staff s;

INSERT INTO dbo.EmployeeSalaries
    (Id,EmployeeId,PaymentType,BasicSalary,DailyRate,PositionAllowance,OtherAllowance,Bonus,SocialInsuranceSalary,EffectiveFrom,CreatedTime,LastUpdatedTime)
SELECT NEWID(), s.EmployeeId, 1, 15000000, 0, 500000, 500000, 0, 12000000, DATEADD(day,-180,@today), @now, @now
FROM @staff s;

INSERT INTO dbo.EmployeeBankAccounts (Id,EmployeeId,BankId,AccountNumber,AccountHolderName,IsPrimary,Status,CreatedTime,LastUpdatedTime)
SELECT NEWID(), s.EmployeeId, b.Id, CONCAT(N'001234567', FORMAT(s.Seq,N'00')),
       CONCAT(s.GivenName,N' ',s.FamilyName), 1, 1, @now, @now
FROM @staff s CROSS JOIN dbo.Banks b WHERE b.Code = N'VCB';

INSERT INTO dbo.Payrolls
    (Id,EmployeeId,PayrollMonth,BasicSalary,Allowance,Bonus,Overtime,Insurance,Tax,Deduction,NetSalary,Status,PayDate,PaymentMethod,CreatedTime,LastUpdatedTime)
SELECT NEWID(), s.EmployeeId, DATEFROMPARTS(YEAR(@today),MONTH(@today),1), 15000000,1000000,500000,0,1200000,300000,0,15000000,
       CASE WHEN s.Seq <= 3 THEN 2 ELSE 1 END, NULL, 2, @now, @now
FROM @staff s;

INSERT INTO dbo.LeaveRequests
    (Id,EmployeeId,LeaveTypeId,FromDate,ToDate,TotalDays,Reason,Status,ApprovedBy,ApprovedAt,CreatedTime,LastUpdatedTime)
SELECT NEWID(), s.EmployeeId, t.Id, DATEADD(day,5+s.Seq,@today), DATEADD(day,5+s.Seq,@today), 1,
       N'Đơn nghỉ phép demo', CASE WHEN s.Seq <= 3 THEN 2 ELSE 1 END,
       CASE WHEN s.Seq <= 3 THEN @mgrEmp ELSE NULL END,
       CASE WHEN s.Seq <= 3 THEN DATEADD(day,1,@today) ELSE NULL END, @now, @now
FROM @staff s CROSS JOIN dbo.LeaveTypes t WHERE t.Code = N'ANNUAL';

/* ---- 5 ngay cong: 3 duyet + 2 cho ---- */
;WITH DateRange AS
(
    SELECT CAST(DATEADD(day,-1,@today) AS date) AS WorkDate, 1 AS n
    UNION ALL
    SELECT DATEADD(day,-1,WorkDate), n+1 FROM DateRange WHERE n < 30
),
WorkDays AS
(
    SELECT WorkDate, ROW_NUMBER() OVER (ORDER BY WorkDate DESC) AS DaySeq
    FROM DateRange
    WHERE DATEDIFF(day, CONVERT(date,'1900-01-01'), WorkDate) % 7 BETWEEN 0 AND 4
)
INSERT INTO dbo.Attendances
    (Id,EmployeeId,AttendanceDate,Status,PlannedShiftId,PlannedHours,ActualHours,ApprovalStatus,ApprovedBy,ApprovedAt,CreatedTime,LastUpdatedTime)
SELECT NEWID(), s.EmployeeId, w.WorkDate, 1, sh.Id, 8, 8,
       CASE WHEN w.DaySeq <= 3 THEN 1 ELSE 0 END,
       CASE WHEN w.DaySeq <= 3 THEN @mgrEmp ELSE NULL END,
       CASE WHEN w.DaySeq <= 3 THEN DATEADD(hour,18,CAST(w.WorkDate AS datetime2)) ELSE NULL END, @now, @now
FROM WorkDays w
JOIN @staff s ON s.Seq = ((w.DaySeq - 1) % 6) + 1
CROSS JOIN dbo.Shifts sh
WHERE w.DaySeq <= 5 AND sh.Code = N'HC'
OPTION (MAXRECURSION 40);

INSERT INTO dbo.AttendanceLogs (Id,AttendanceId,LogTime,[Type],[Method],DeviceId,IsAdjusted,CreatedTime,LastUpdatedTime)
SELECT NEWID(), a.Id, TODATETIMEOFFSET(DATEADD(hour,8,CAST(a.AttendanceDate AS datetime2)),'+07:00'), 1, 4, N'DEMO-PHONE', 0, @now, @now
FROM dbo.Attendances a WHERE a.EmployeeId IN (SELECT Id FROM @empIds)
UNION ALL
SELECT NEWID(), a.Id, TODATETIMEOFFSET(DATEADD(hour,17,CAST(a.AttendanceDate AS datetime2)),'+07:00'), 2, 4, N'DEMO-PHONE', 0, @now, @now
FROM dbo.Attendances a WHERE a.EmployeeId IN (SELECT Id FROM @empIds);

COMMIT TRANSACTION;

PRINT N'Đã seed 6 user demo (SDT + Hovaten123@), 5 ngày công, 6 đơn nghỉ, 6 lương, 6 hợp đồng.';
