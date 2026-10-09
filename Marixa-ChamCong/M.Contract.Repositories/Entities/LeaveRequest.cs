using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    public class LeaveRequest : BaseEntity
    {
        // Khóa ngoại tới nhân viên gửi yêu cầu
        [Required]
        public Guid EmployeeId { get; set; }

        // Điều hướng tới Employee
        [ForeignKey(nameof(EmployeeId))]
        public virtual Employee? Employee { get; set; }

        // Loại nghỉ phép
        [Required]
        public Guid LeaveTypeId { get; set; }

        [ForeignKey(nameof(LeaveTypeId))]
        public virtual LeaveType? LeaveType { get; set; }

        // Ngày bắt đầu
        [Required]
        public DateTime FromDate { get; set; }

        // Ngày kết thúc
        [Required]
        public DateTime ToDate { get; set; }

        // Tổng số ngày (có thể tính trước hoặc sau)
        [Column(TypeName = "decimal(10,2)")]
        public decimal? TotalDays { get; set; }

        // Lý do
        public string? Reason { get; set; }

        // Trạng thái yêu cầu (mặc định Pending)
        [Required]
        public LeaveRequestStatus Status { get; set; }
            = LeaveRequestStatus.Pending;

        // Ai duyệt (Employee.Id của người duyệt)
        public Guid? ApprovedBy { get; set; }

        // Điều hướng tới nhân viên duyệt
        [ForeignKey(nameof(ApprovedBy))]
        public virtual Employee? Approver { get; set; }

        // Thời gian duyệt
        public DateTime? ApprovedAt { get; set; }
    }

    // Các trạng thái có thể của yêu cầu nghỉ phép
    public enum LeaveRequestStatus
    {
        Pending = 1,
        Approved = 2,
        Rejected = 3,
        Cancelled = 4
    }
}
