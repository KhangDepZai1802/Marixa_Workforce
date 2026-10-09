using M.Contract.Repositories.Entities;
using M.Contract.Repositories.Entity;
using System.Threading;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace M.Repositories.Context
{
    public class DatabaseContext : IdentityDbContext<
        ApplicationUser,
        ApplicationRole,
        Guid,
        ApplicationUserClaim,
        ApplicationUserRole,
        ApplicationUserLogin,
        ApplicationRoleClaim,
        ApplicationUserToken>
    {
        public DatabaseContext(
            DbContextOptions<DatabaseContext> options)
            : base(options)
        {
        }

        // =====================================================
        // =====================================================
        // POSTGRESQL: normalize DateTime -> UTC before SaveChanges
        //
        // Npgsql maps C# DateTime to PostgreSQL "timestamptz" and REJECTS
        // values whose Kind is Local or Unspecified (only Utc is accepted).
        // EF may surface loaded timestamptz values as Kind=Local, and client
        // JSON without an offset deserializes to Kind=Unspecified. This global
        // interceptor normalizes every DateTime / DateTime? value property on
        // added/modified entities to UTC, in one place, for every write path
        // (update, approve, create, and any future service). It is a no-op on
        // SQL Server (local dev), which ignores DateTime.Kind.
        // =====================================================

        public override int SaveChanges(bool acceptAllChangesOnSuccess)
        {
            if (Database.IsNpgsql())
                NormalizeDateTimePropertiesToUtc();
            return base.SaveChanges(acceptAllChangesOnSuccess);
        }

        public override Task<int> SaveChangesAsync(
            bool acceptAllChangesOnSuccess,
            CancellationToken cancellationToken = default)
        {
            if (Database.IsNpgsql())
                NormalizeDateTimePropertiesToUtc();
            return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
        }

        public override Task<int> SaveChangesAsync(
            CancellationToken cancellationToken = default)
        {
            if (Database.IsNpgsql())
                NormalizeDateTimePropertiesToUtc();
            return base.SaveChangesAsync(cancellationToken);
        }

        private void NormalizeDateTimePropertiesToUtc()
        {
            foreach (var entry in ChangeTracker.Entries())
            {
                if (entry.Entity is null) continue;
                if (entry.State is not (EntityState.Added or EntityState.Modified)) continue;

                // Use reflection to find and normalize DateTime/DateTime? properties
                // on the entity. This works for all entity types without needing
                // per-type model metadata.
                var type = entry.Entity.GetType();
                foreach (var prop in type.GetProperties())
                {
                    if (!prop.CanWrite) continue;
                    // Only inspect DateTime / DateTime? value-type properties.
                    if (prop.PropertyType != typeof(DateTime) &&
                        prop.PropertyType != typeof(DateTime?))
                    {
                        continue;
                    }

                    // A boxed Nullable<DateTime> that has a value is a DateTime;
                    // a null Nullable boxes as null. So a single "is DateTime"
                    // check covers both non-null and nullable-with-value cases.
                    if (prop.GetValue(entry.Entity) is DateTime dt)
                    {
                        prop.SetValue(entry.Entity, ToUtcSafe(dt));
                    }
                }
            }
        }

        private static DateTime ToUtcSafe(DateTime value)
        {
            if (value.Kind == DateTimeKind.Unspecified)
                return DateTime.SpecifyKind(value, DateTimeKind.Utc);
            if (value.Kind == DateTimeKind.Local)
                return value.ToUniversalTime();
            return value; // already Utc
        }

        // IDENTITY
        // =====================================================

        public virtual DbSet<ApplicationUser> ApplicationUser
            => Set<ApplicationUser>();

        public virtual DbSet<ApplicationRole> ApplicationRole
            => Set<ApplicationRole>();

        public virtual DbSet<ApplicationUserClaim> ApplicationUserClaim
            => Set<ApplicationUserClaim>();

        public virtual DbSet<ApplicationUserRole> ApplicationUserRole
            => Set<ApplicationUserRole>();

        public virtual DbSet<ApplicationUserLogin> ApplicationUserLogin
            => Set<ApplicationUserLogin>();

        public virtual DbSet<ApplicationRoleClaim> ApplicationRoleClaim
            => Set<ApplicationRoleClaim>();

        public virtual DbSet<ApplicationUserToken> ApplicationUserToken
            => Set<ApplicationUserToken>();


        // =====================================================
        // HRMS
        // =====================================================

        public DbSet<Employee> Employees { get; set; }

        public DbSet<Department> Departments { get; set; }

        public DbSet<Position> Positions { get; set; }

        public DbSet<EmployeeContract> EmployeeContracts { get; set; }

        public DbSet<SalaryGroup> SalaryGroups { get; set; }

        public DbSet<EmployeeSalary> EmployeeSalaries { get; set; }

        public DbSet<EmployeeInsurance> EmployeeInsurances { get; set; }

        public DbSet<Bank> Banks { get; set; }

        public DbSet<EmployeeBankAccount> EmployeeBankAccounts { get; set; }

        public DbSet<EmployeeDependent> EmployeeDependents { get; set; }

        public DbSet<Attendance> Attendances { get; set; }

        public DbSet<AttendanceLog> AttendanceLogs { get; set; }

        public DbSet<LeaveType> LeaveTypes { get; set; }

        public DbSet<LeaveRequest> LeaveRequests { get; set; }

        public DbSet<Payroll> Payrolls { get; set; }

        public DbSet<Shift> Shifts { get; set; }

        public DbSet<EmployeeShift> EmployeeShifts { get; set; }

        public DbSet<OvertimeRequest> OvertimeRequests { get; set; }

        public DbSet<LeaveLedger> LeaveLedger { get; set; }

        public DbSet<AttendanceCorrection> AttendanceCorrections { get; set; }

        public DbSet<OfficeLocation> OfficeLocations { get; set; }

        public DbSet<HolidayCalendar> HolidayCalendars { get; set; }

        public DbSet<AttendanceRule> AttendanceRules { get; set; }

        public DbSet<ActivationCode> ActivationCodes { get; set; }

        public DbSet<EmployeeReport> EmployeeReports { get; set; }

        public DbSet<EmployeeReportVersion> EmployeeReportVersions { get; set; }

        public DbSet<EmployeeReportAttachment> EmployeeReportAttachments { get; set; }

        public DbSet<EmployeeReportEvent> EmployeeReportEvents { get; set; }

        public DbSet<EmployeePromotion> EmployeePromotions { get; set; }

        public DbSet<EmployeeHandover> EmployeeHandovers { get; set; }

        public DbSet<WorkTask> WorkTasks { get; set; }

        public DbSet<WorkTaskComment> WorkTaskComments { get; set; }

        public DbSet<WorkPerformance> WorkPerformances { get; set; }

        public DbSet<WorkProject> WorkProjects { get; set; }

        public DbSet<WorkProjectMember> WorkProjectMembers { get; set; }

public DbSet<AuditLog> AuditLogs { get; set; }


        // =====================================================
        // RELATIONSHIPS
        // =====================================================

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

            builder.Entity<EmployeePromotion>()
                .HasOne<Employee>()
                .WithMany()
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<EmployeePromotion>().HasIndex(x => new { x.EmployeeId, x.Status });
            builder.Entity<EmployeeHandover>()
                .HasOne<Employee>()
                .WithMany()
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<EmployeeHandover>().HasIndex(x => new { x.EmployeeId, x.Status });

            // =========================================================
            // WORK TASK
            // =========================================================
            builder.Entity<WorkTask>()
                .HasOne(x => x.AssignedBy)
                .WithMany()
                .HasForeignKey(x => x.AssignedById)
                .OnDelete(DeleteBehavior.NoAction);
            builder.Entity<WorkTask>()
                .HasOne(x => x.Assignee)
                .WithMany()
                .HasForeignKey(x => x.AssigneeId)
                .OnDelete(DeleteBehavior.NoAction);
            builder.Entity<WorkTask>().HasIndex(x => new { x.AssigneeId, x.Status });

            builder.Entity<WorkTaskComment>()
                .HasOne(x => x.Task)
                .WithMany(t => t.Comments)
                .HasForeignKey(x => x.TaskId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<WorkTaskComment>().HasIndex(x => x.TaskId);

            // =========================================================
            // WORK PERFORMANCE
            // =========================================================
            builder.Entity<WorkPerformance>()
                .HasOne(x => x.Employee)
                .WithMany()
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.NoAction);
            builder.Entity<WorkPerformance>().HasIndex(x => new { x.EmployeeId, x.Period });

            // =========================================================
            // WORK PROJECT
            // =========================================================
            builder.Entity<WorkProject>()
                .HasOne(x => x.Owner)
                .WithMany()
                .HasForeignKey(x => x.OwnerEmployeeId)
                .OnDelete(DeleteBehavior.NoAction);

            builder.Entity<WorkProjectMember>()
                .HasOne(x => x.Project)
                .WithMany(p => p.Members)
                .HasForeignKey(x => x.ProjectId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<WorkProjectMember>()
                .HasOne(x => x.Employee)
                .WithMany()
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.NoAction);
            builder.Entity<WorkProjectMember>().HasIndex(x => x.EmployeeId);
            builder.Entity<WorkProjectMember>().HasIndex(x => new { x.ProjectId, x.EmployeeId });


            // =========================================================
            // AUDIT LOG (append-only trail)
            // =========================================================
            builder.Entity<AuditLog>()
                .HasOne(x => x.ActorEmployee)
                .WithMany()
                .HasForeignKey(x => x.ActorEmployeeId)
                .OnDelete(DeleteBehavior.NoAction);
            builder.Entity<AuditLog>().HasIndex(x => new { x.EntityType, x.EntityId });
            builder.Entity<AuditLog>().HasIndex(x => x.CreatedTime);
            // =========================================================
            // EMPLOYEE - DEPARTMENT
            // =========================================================

            builder.Entity<Employee>()
                .HasOne(e => e.Department)
                .WithMany(d => d.Employees)
                .HasForeignKey(e => e.DepartmentId)
                .OnDelete(DeleteBehavior.SetNull);


            // =========================================================
            // DEPARTMENT - MANAGER
            // =========================================================

            builder.Entity<Department>()
                .HasOne(d => d.Manager)
                .WithMany()
                .HasForeignKey(d => d.ManagerId)
                .OnDelete(DeleteBehavior.SetNull);


            // =========================================================
            // EMPLOYEE - MANAGER
            // =========================================================

            builder.Entity<Employee>()
                .HasOne(e => e.Manager)
                .WithMany(e => e.Subordinates)
                .HasForeignKey(e => e.ManagerId)
                .OnDelete(DeleteBehavior.NoAction);


            // =========================================================
            // EMPLOYEE - APPLICATION USER
            // =========================================================

            builder.Entity<Employee>()
                .HasOne(e => e.User)
                .WithOne()
                .HasForeignKey<Employee>(e => e.UserId)
                .OnDelete(DeleteBehavior.SetNull);


            // =========================================================
            // EMPLOYEE - LEAVE REQUEST
            // =========================================================

            builder.Entity<LeaveRequest>()
                .HasOne(l => l.Employee)
                .WithMany(e => e.LeaveRequests)
                .HasForeignKey(l => l.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);


            // =========================================================
            // LEAVE REQUEST - APPROVER
            // =========================================================

            builder.Entity<LeaveRequest>()
                .HasOne(l => l.Approver)
                .WithMany()
                .HasForeignKey(l => l.ApprovedBy)
                .OnDelete(DeleteBehavior.SetNull);


            // =========================================================
            // ATTENDANCE - EMPLOYEE
            // =========================================================

            builder.Entity<Attendance>()
                .HasOne(a => a.Employee)
                .WithMany(e => e.Attendances)
                .HasForeignKey(a => a.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);


            // =========================================================
            // ATTENDANCE LOG - ATTENDANCE
            // =========================================================

            builder.Entity<AttendanceLog>()
                .HasOne(l => l.Attendance)
                .WithMany(a => a.AttendanceLogs)
                .HasForeignKey(l => l.AttendanceId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.Entity<EmployeeReport>()
                .HasOne(r => r.Employee).WithMany().HasForeignKey(r => r.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<EmployeeReport>()
                .HasIndex(r => r.ReportCode).IsUnique();
            builder.Entity<EmployeeReportVersion>()
                .HasOne(v => v.Report).WithMany(r => r.Versions).HasForeignKey(v => v.ReportId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<EmployeeReportAttachment>()
                .HasOne(a => a.Version).WithMany(v => v.Attachments).HasForeignKey(a => a.VersionId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.Entity<EmployeeReportEvent>()
                .HasOne(e => e.Report).WithMany(r => r.Events).HasForeignKey(e => e.ReportId)
                .OnDelete(DeleteBehavior.Cascade);

            // =========================================================
            // EMPLOYEE SHIFT - EMPLOYEE
            // =========================================================

            builder.Entity<EmployeeShift>()
                .HasOne(x => x.Employee)
                .WithMany()
                .HasForeignKey(x => x.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            // =========================================================
            // EMPLOYEE SHIFT - SHIFT
            // =========================================================

            builder.Entity<EmployeeShift>()
                .HasOne(x => x.Shift)
                .WithMany(s => s.EmployeeShifts)
                .HasForeignKey(x => x.ShiftId)
                .OnDelete(DeleteBehavior.Restrict);

            // =========================================================
            // ATTENDANCE - APPROVER
            // =========================================================

            builder.Entity<Attendance>()
                .HasOne(a => a.Approver)
                .WithMany()
                .HasForeignKey(a => a.ApprovedBy)
                .OnDelete(DeleteBehavior.SetNull);

            // =========================================================
            // ACTIVATION CODE - EMPLOYEE
            // =========================================================

            builder.Entity<ActivationCode>()
                .HasOne(a => a.Employee)
                .WithMany()
                .HasForeignKey(a => a.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);

            // =========================================================
            // ACTIVATION CODE - USER
            // =========================================================

            builder.Entity<ActivationCode>()
                .HasOne(a => a.User)
                .WithMany()
                .HasForeignKey(a => a.UserId)
                .OnDelete(DeleteBehavior.SetNull);

            // =========================================================
            // OVERTIME REQUEST - EMPLOYEE / APPROVER / ATTENDANCE
            // =========================================================
            builder.Entity<OvertimeRequest>()
                .HasOne(o => o.Employee)
                .WithMany(e => e.OvertimeRequests)
                .HasForeignKey(o => o.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<OvertimeRequest>()
                .HasOne(o => o.Approver)
                .WithMany()
                .HasForeignKey(o => o.ApprovedBy)
                .OnDelete(DeleteBehavior.SetNull);
            builder.Entity<OvertimeRequest>()
                .HasOne(o => o.Attendance)
                .WithMany()
                .HasForeignKey(o => o.AttendanceId)
                .OnDelete(DeleteBehavior.SetNull);
            builder.Entity<OvertimeRequest>().HasIndex(o => new { o.EmployeeId, o.WorkDate });

            // =========================================================
            // LEAVE LEDGER - EMPLOYEE / TYPE / REQUEST
            // =========================================================
            builder.Entity<LeaveLedger>()
                .HasOne(l => l.Employee)
                .WithMany(e => e.LeaveLedgers)
                .HasForeignKey(l => l.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<LeaveLedger>()
                .HasOne(l => l.LeaveType)
                .WithMany()
                .HasForeignKey(l => l.LeaveTypeId)
                // Keep historical ledger entries linked and avoid SQL Server's multiple cascade paths.
                .OnDelete(DeleteBehavior.NoAction);
            builder.Entity<LeaveLedger>()
                .HasOne(l => l.LeaveRequest)
                .WithMany()
                .HasForeignKey(l => l.LeaveRequestId)
                .OnDelete(DeleteBehavior.SetNull);
            builder.Entity<LeaveLedger>().HasIndex(l => new { l.EmployeeId, l.Year });

            // =========================================================
            // ATTENDANCE CORRECTION - EMPLOYEE / APPROVER / ATTENDANCE
            // =========================================================
            builder.Entity<AttendanceCorrection>()
                .HasOne(c => c.Employee)
                .WithMany(e => e.AttendanceCorrections)
                .HasForeignKey(c => c.EmployeeId)
                .OnDelete(DeleteBehavior.Restrict);
            builder.Entity<AttendanceCorrection>()
                .HasOne(c => c.Reviewer)
                .WithMany()
                .HasForeignKey(c => c.ReviewedBy)
                .OnDelete(DeleteBehavior.SetNull);
            builder.Entity<AttendanceCorrection>()
                .HasOne(c => c.Attendance)
                .WithMany()
                .HasForeignKey(c => c.AttendanceId)
                .OnDelete(DeleteBehavior.SetNull);
            builder.Entity<AttendanceCorrection>().HasIndex(c => new { c.EmployeeId, c.WorkDate });
        }
    }
}
