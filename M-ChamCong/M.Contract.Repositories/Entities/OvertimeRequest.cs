using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    /// <summary>
    /// Yêu cầu tăng ca (overtime). Tăng ca CHỈ được tính sau khi được
    /// duyệt (quyết định V1: "tăng ca có duyệt"). Không tự động lấy toàn bộ
    /// khoảng giờ ra muộn — nhân viên/HR tạo yêu cầu, HR hoặc admin duyệt.
    /// </summary>
    public class OvertimeRequest : BaseEntity
    {
        // Khóa ngoại tới nhân viên (bắt buộc)
        [Required]
        public Guid EmployeeId { get; set; }

        [ForeignKey(nameof(EmployeeId))]
        public virtual Employee? Employee { get; set; }

        // Bản ghi chấm công liên quan (nếu có) — để tra cứu/mối nối
        public Guid? AttendanceId { get; set; }

        [ForeignKey(nameof(AttendanceId))]
        public virtual Attendance? Attendance { get; set; }

        // Ngày công (làm tăng ca vào ngày nào)
        [Required]
        public DateTime WorkDate { get; set; }

        // Khoảng thời gian tăng ca (thời điểm, có offset)
        public DateTimeOffset? StartAt { get; set; }
        public DateTimeOffset? EndAt { get; set; }

        // Số giờ tăng ca (tính từ StartAt->EndAt hoặc nhập tay)
        [Column(TypeName = "decimal(10,2)")]
        public decimal? OvertimeHours { get; set; }

        // Lý do tăng ca
        [MaxLength(500)]
        public string? Reason { get; set; }

        // Trạng thái duyệt (mặc định Pending)
        [Required]
        public OvertimeStatus Status { get; set; } = OvertimeStatus.Pending;

        // Người duyệt (Employee.Id)
        public Guid? ApprovedBy { get; set; }

        [ForeignKey(nameof(ApprovedBy))]
        public virtual Employee? Approver { get; set; }

        // Thời điểm duyệt
        public DateTime? ApprovedAt { get; set; }

        // Ghi chú của người duyệt
        [MaxLength(500)]
        public string? Note { get; set; }
    }

    public enum OvertimeStatus
    {
        Pending = 1,
        Approved = 2,
        Rejected = 3,
        Cancelled = 4
    }
}
