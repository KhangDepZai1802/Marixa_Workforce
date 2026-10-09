using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    /// <summary>
    /// Nhật ký thay đổi (audit trail) — requirement 6 docs/01-business-analysis.md
    /// và bảng audit_logs trong docs/02-database-design.md.
    ///
    /// Ghi mọi thay đổi nghiệp vụ: công, duyệt đơn, sổ phép, role, cấu hình,
    /// kỳ công, xóa ảnh. KHÔNG sửa/xóa — chỉ INSERT (append-only).
    /// Chỉ admin xem toàn bộ; HR/admin xem theo quyền.
    /// </summary>
    public class AuditLog : BaseEntity
    {
        // =========================================================
        // NGƯỜI THAO TÁC
        // =========================================================

        /// <summary>Tên người dùng (Identity) thực hiện thao tác, hoặc "System".</summary>
        [MaxLength(128)]
        public string? ActorUserName { get; set; }

        /// <summary>Employee.Id của người thao tác (nếu gắn hồ sơ; null cho System).</summary>
        public Guid? ActorEmployeeId { get; set; }

        [ForeignKey(nameof(ActorEmployeeId))]
        public virtual Employee? ActorEmployee { get; set; }

        // =========================================================
        // NỘI DUNG THAO TÁC
        // =========================================================

        /// <summary>
        /// Nhóm hành động (xem enum AuditAction).
        /// </summary>
        [Required]
        public AuditAction Action { get; set; }

        /// <summary>
        /// Loại entity bị tác động: "Attendance", "LeaveRequest", "OvertimeRequest",
        /// "Employee", "Payroll", "Role", "TimesheetPeriod", "AttendanceRule",
        /// "AttendanceCorrection", "OfficeLocation", "HolidayCalendar", "BankAccount",
        /// "AttendanceLog", "System", ...
        /// </summary>
        [MaxLength(64)]
        public string EntityType { get; set; } = string.Empty;

        /// <summary>Id (Guid) của entity bị tác động.</summary>
        [Required]
        public Guid EntityId { get; set; }

        // =========================================================
        // SNAPSHOT TRƯỚC / SAU (JSON)
        // =========================================================

        /// <summary>JSON snapshot giá trị TRƯỚC khi thay đổi (null = thao tác create).</summary>
        [Column(TypeName = "text")]
        public string? BeforeJson { get; set; }

        /// <summary>JSON snapshot giá trị SAU khi thay đổi (null = thao tác delete).</summary>
        [Column(TypeName = "text")]
        public string? AfterJson { get; set; }

        /// <summary>Lý do / ghi chú bổ sung (có thể null).</summary>
        [MaxLength(500)]
        public string? Reason { get; set; }
    }

    /// <summary>
    /// Nhóm hành động được ghi vào AuditLog.
    /// </summary>
    public enum AuditAction
    {
        Create     = 1,
        Update     = 2,
        Delete     = 3,   // soft delete
        HardDelete = 4,
        Approve    = 5,
        Reject     = 6,
        Cancel     = 7,
        Lock       = 8,   // khóa kỳ
        Unlock     = 9,   // mở khóa kỳ
        Config     = 10,  // thay đổi cấu hình / chính sách
        Role       = 11,  // thay đổi role
        Export     = 12,  // xuất file (Excel/PDF)
        Photo      = 13,  // tải/xóa ảnh
        Login      = 14,  // đăng nhập
        Logout     = 15,  // đăng xuất
        Password   = 16,  // đổi / reset mật khẩu
        Account    = 17   // cấp / khóa tài khoản
    }
}
