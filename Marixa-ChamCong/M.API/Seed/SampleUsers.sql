/*
    Sample SQL Server users for local testing.
    Target database from the active appsettings.json connection: Marixa_001.
    Change the USE line if your test database has another name.

    Login name is the phone number. All eight accounts use the requested
    shared test password; PasswordHash values below use ASP.NET Core Identity.
    The two accountant names are placeholders because names were not supplied.

    Run after the M.BE.sln migrations have completed successfully.
*/
USE [Marixa_001];
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.AspNetRoles', N'U') IS NULL
   OR OBJECT_ID(N'dbo.AspNetUsers', N'U') IS NULL
   OR OBJECT_ID(N'dbo.AspNetUserRoles', N'U') IS NULL
   OR OBJECT_ID(N'dbo.Employees', N'U') IS NULL
BEGIN
    THROW 51000, N'Run Update-Database successfully before executing SampleUsers.sql.', 1;
END;

DECLARE @Now datetimeoffset(7) = SYSDATETIMEOFFSET();
DECLARE @SeedUsers TABLE
(
    PhoneNumber nvarchar(20) NOT NULL PRIMARY KEY,
    EmployeeCode nvarchar(50) NOT NULL UNIQUE,
    FullName nvarchar(100) NOT NULL,
    RoleName nvarchar(256) NOT NULL,
    NormalizedRoleName nvarchar(256) NOT NULL,
    PasswordHash nvarchar(max) NOT NULL,
    EmployeeId uniqueidentifier NOT NULL,
    UserId uniqueidentifier NOT NULL
);

INSERT INTO @SeedUsers
    (PhoneNumber, EmployeeCode, FullName, RoleName, NormalizedRoleName, PasswordHash, EmployeeId, UserId)
VALUES
    (N'0900000001', N'SEED-0001', N'Đinh Văn Tài',       N'Employee',   N'EMPLOYEE',   N'AQAAAAIAAYagAAAAEAGlecjbFp5LIko3TT1oZadBD5NDVdS0tr6MgSayuxH3nnpBHG8snxVOJKOpuRWYFw==', NEWID(), NEWID()),
    (N'0900000002', N'SEED-0002', N'Phùng Vĩnh Luân',    N'Employee',   N'EMPLOYEE',   N'AQAAAAIAAYagAAAAEIcGFmLJ7qRrvazzUbbyl4lIhmnCFjFPLm4mjNszxs0xM3Lencl4w989zrjnSslk4A==', NEWID(), NEWID()),
    (N'0900000003', N'SEED-0003', N'Lê Anh Khoa',        N'HR',         N'HR',         N'AQAAAAIAAYagAAAAEB9wnEpqhp2bjMmFNG+K6mq6C5jYKy/0+zGIv7yKaaLPOLEASuAXVUBCY1BzOCFmgg==', NEWID(), NEWID()),
    (N'0900000004', N'SEED-0004', N'Trần Phụng Tuyền',   N'HR',         N'HR',         N'AQAAAAIAAYagAAAAEIFCe8yY9Nw98nfC7t/apjmpJj7vu0Gf5p1K7kPuFnErzHiAorSHvSkAmBdpDFNshQ==', NEWID(), NEWID()),
    (N'0900000005', N'SEED-0005', N'Huỳnh Hoàng Đăng',   N'Manager',    N'MANAGER',    N'AQAAAAIAAYagAAAAEAxmatSirX3GlHI6yOR/WCVdShBsY87Um4MIobpfiQKXJWAwpKZNqVLfIOO08eaZzQ==', NEWID(), NEWID()),
    (N'0900000006', N'SEED-0006', N'Josept Đức Tuấn',    N'Admin',      N'ADMIN',      N'AQAAAAIAAYagAAAAEBaV886A23r+PEkJtaZ2Tc0uMsqER0cY10FLP3Z0EwCz3rJGXt46BQkanUDp5Cc4Lg==', NEWID(), NEWID()),
    (N'0900000007', N'SEED-0007', N'Kế toán 1',          N'Accountant', N'ACCOUNTANT', N'AQAAAAIAAYagAAAAED48pKeKPIqdCfqcNwT0P91FlDuytHwL2yzzpvecHngrM7pd8NQq8zRBctONjGtnYg==', NEWID(), NEWID()),
    (N'0900000008', N'SEED-0008', N'Kế toán 2',          N'Accountant', N'ACCOUNTANT', N'AQAAAAIAAYagAAAAEGHBy6LgU1GPxWuk+RKi2T+67sRLQ3dfwLvYAo6KtcxNnUEZzuQaBku94WPKC9KIRg==', NEWID(), NEWID());

DECLARE @SeedRoles TABLE
(
    Name nvarchar(256) NOT NULL,
    NormalizedName nvarchar(256) NOT NULL,
    Description nvarchar(500) NOT NULL
);

INSERT INTO @SeedRoles (Name, NormalizedName, Description)
VALUES
    (N'Employee',   N'EMPLOYEE',   N'Nhân viên'),
    (N'Manager',    N'MANAGER',    N'Quản lý'),
    (N'Accountant', N'ACCOUNTANT', N'Kế toán'),
    (N'HR',         N'HR',         N'Nhân sự'),
    (N'Admin',      N'ADMIN',      N'Quản trị hệ thống');

BEGIN TRY
    BEGIN TRANSACTION;

    INSERT INTO dbo.AspNetRoles
        (Id, CreatedBy, LastUpdatedBy, DeletedBy, CreatedTime, LastUpdatedTime, DeletedTime,
         Description, Name, NormalizedName, ConcurrencyStamp)
    SELECT
        NEWID(), N'SampleUsers.sql', N'SampleUsers.sql', NULL, @Now, @Now, NULL,
        r.Description, r.Name, r.NormalizedName, CONVERT(nvarchar(36), NEWID())
    FROM @SeedRoles AS r
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.AspNetRoles AS existing WITH (UPDLOCK, HOLDLOCK)
        WHERE existing.NormalizedName = r.NormalizedName
    );

    -- Insert employee rows first because AspNetUsers.EmployeeId references Employees.Id.
    -- GivenName stores the full display name, matching the existing AdminSeeder convention.
    INSERT INTO dbo.Employees
        (Id, EmployeeCode, GivenName, FamilyName, Gender, PhoneNumber, UserId,
         LaborType, Status, UsePhoneAttendance, CreatedBy, LastUpdatedBy, CreatedTime, LastUpdatedTime)
    SELECT
        s.EmployeeId, s.EmployeeCode, s.FullName, N'', 0, s.PhoneNumber, NULL,
        1, 2, 1, N'SampleUsers.sql', N'SampleUsers.sql', @Now, @Now
    FROM @SeedUsers AS s
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.Employees AS existing WITH (UPDLOCK, HOLDLOCK)
        WHERE existing.EmployeeCode = s.EmployeeCode
           OR existing.PhoneNumber = s.PhoneNumber
    );

    -- Reuse matching employee rows on repeat executions.
    UPDATE s
    SET EmployeeId = match.Id
    FROM @SeedUsers AS s
    CROSS APPLY
    (
        SELECT TOP (1) e.Id
        FROM dbo.Employees AS e
        WHERE e.PhoneNumber = s.PhoneNumber OR e.EmployeeCode = s.EmployeeCode
        ORDER BY CASE WHEN e.PhoneNumber = s.PhoneNumber THEN 0 ELSE 1 END, e.CreatedTime
    ) AS match;

    -- Reuse accounts identified by username or phone number.
    UPDATE s
    SET UserId = match.Id
    FROM @SeedUsers AS s
    CROSS APPLY
    (
        SELECT TOP (1) u.Id
        FROM dbo.AspNetUsers AS u
        WHERE u.NormalizedUserName = UPPER(s.PhoneNumber) OR u.PhoneNumber = s.PhoneNumber
        ORDER BY CASE WHEN u.NormalizedUserName = UPPER(s.PhoneNumber) THEN 0 ELSE 1 END, u.CreatedTime
    ) AS match;

    IF EXISTS
    (
        SELECT 1
        FROM @SeedUsers AS s
        JOIN dbo.Employees AS e ON e.Id = s.EmployeeId
        WHERE e.UserId IS NOT NULL AND e.UserId <> s.UserId
    )
    BEGIN
        THROW 51001, N'A sample employee is already linked to a different user account.', 1;
    END;

    IF EXISTS
    (
        SELECT 1
        FROM @SeedUsers AS s
        JOIN dbo.AspNetUsers AS u ON u.Id = s.UserId
        WHERE u.EmployeeId IS NOT NULL AND u.EmployeeId <> s.EmployeeId
    )
    BEGIN
        THROW 51002, N'A sample user is already linked to a different employee.', 1;
    END;

    INSERT INTO dbo.AspNetUsers
        (Id, EmployeeId, CreatedBy, LastUpdatedBy, DeletedBy, CreatedTime, LastUpdatedTime, DeletedTime,
         UserName, NormalizedUserName, Email, NormalizedEmail, EmailConfirmed, PasswordHash,
         SecurityStamp, ConcurrencyStamp, PhoneNumber, PhoneNumberConfirmed, TwoFactorEnabled,
         LockoutEnd, LockoutEnabled, AccessFailedCount)
    SELECT
        s.UserId, s.EmployeeId, N'SampleUsers.sql', N'SampleUsers.sql', NULL, @Now, @Now, NULL,
        s.PhoneNumber, UPPER(s.PhoneNumber), NULL, NULL, 0, s.PasswordHash,
        CONVERT(nvarchar(36), NEWID()), CONVERT(nvarchar(36), NEWID()), s.PhoneNumber, 0, 0,
        NULL, 1, 0
    FROM @SeedUsers AS s
    WHERE NOT EXISTS (SELECT 1 FROM dbo.AspNetUsers AS u WHERE u.Id = s.UserId);

    -- These are test accounts: each listed account is reset to the requested shared password.
    UPDATE u
    SET u.EmployeeId = s.EmployeeId,
        u.UserName = s.PhoneNumber,
        u.NormalizedUserName = UPPER(s.PhoneNumber),
        u.PasswordHash = s.PasswordHash,
        u.SecurityStamp = CONVERT(nvarchar(36), NEWID()),
        u.ConcurrencyStamp = CONVERT(nvarchar(36), NEWID()),
        u.PhoneNumber = s.PhoneNumber,
        u.PhoneNumberConfirmed = 0,
        u.EmailConfirmed = 0,
        u.DeletedTime = NULL,
        u.LastUpdatedBy = N'SampleUsers.sql',
        u.LastUpdatedTime = @Now,
        u.LockoutEnd = NULL,
        u.AccessFailedCount = 0
    FROM dbo.AspNetUsers AS u
    JOIN @SeedUsers AS s ON s.UserId = u.Id;

    UPDATE e
    SET e.UserId = s.UserId,
        e.GivenName = s.FullName,
        e.FamilyName = N'',
        e.PhoneNumber = s.PhoneNumber,
        e.LaborType = 1, -- FullTime
        e.Status = 2,    -- Working
        e.UsePhoneAttendance = 1,
        e.DeletedTime = NULL,
        e.LastUpdatedBy = N'SampleUsers.sql',
        e.LastUpdatedTime = @Now
    FROM dbo.Employees AS e
    JOIN @SeedUsers AS s ON s.EmployeeId = e.Id;

    INSERT INTO dbo.AspNetUserRoles
        (UserId, RoleId, CreatedBy, LastUpdatedBy, DeletedBy, CreatedTime, LastUpdatedTime, DeletedTime)
    SELECT
        s.UserId, r.Id, N'SampleUsers.sql', N'SampleUsers.sql', NULL, @Now, @Now, NULL
    FROM @SeedUsers AS s
    JOIN dbo.AspNetRoles AS r ON r.NormalizedName = s.NormalizedRoleName
    WHERE NOT EXISTS
    (
        SELECT 1
        FROM dbo.AspNetUserRoles AS existing
        WHERE existing.UserId = s.UserId AND existing.RoleId = r.Id
    );

    COMMIT TRANSACTION;

    SELECT
        s.PhoneNumber AS LoginName,
        e.EmployeeCode,
        e.GivenName AS DisplayName,
        r.Name AS RoleName
    FROM @SeedUsers AS s
    JOIN dbo.Employees AS e ON e.Id = s.EmployeeId
    JOIN dbo.AspNetUserRoles AS ur ON ur.UserId = s.UserId
    JOIN dbo.AspNetRoles AS r ON r.Id = ur.RoleId AND r.NormalizedName = s.NormalizedRoleName
    ORDER BY s.PhoneNumber;
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
