using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.LeaveRequestModelView
{
    public class LeaveRequestResponseModelView
    {
        public Guid Id { get; set; }

        public Guid EmployeeId { get; set; }

        public string? EmployeeCode { get; set; }

        public string? EmployeeName { get; set; }

        public Guid LeaveTypeId { get; set; }

        public string? LeaveTypeName { get; set; }

        public DateTime FromDate { get; set; }

        public DateTime ToDate { get; set; }

        public decimal? TotalDays { get; set; }

        public string? Reason { get; set; }

        public LeaveRequestStatus Status { get; set; }

        public Guid? ApprovedBy { get; set; }

        public string? ApproverName { get; set; }

        public DateTime? ApprovedAt { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreateLeaveRequestModelView
    {
        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public Guid LeaveTypeId { get; set; }

        [Required]
        public DateTime FromDate { get; set; }

        [Required]
        public DateTime ToDate { get; set; }

        public decimal? TotalDays { get; set; }

        public string? Reason { get; set; }
    }


    public class UpdateLeaveRequestModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public Guid LeaveTypeId { get; set; }

        [Required]
        public DateTime FromDate { get; set; }

        [Required]
        public DateTime ToDate { get; set; }

        public decimal? TotalDays { get; set; }

        public string? Reason { get; set; }
    }

    // ===== Decision (approve / reject) =====
    /// <summary>
    /// Body cho endpoint duyệt / từ chối / hủy đơn nghỉ phép.
    /// <para>
    /// Theo docs Marixa:
    ///  - Không ai được duyệt yêu cầu của chính mình.
    ///  - HR duyệt đơn của nhân viên + admin có hồ sơ;
    ///    Admin duyệt đơn của HR.
    ///  - Đơn nghỉ phép năm (LeaveType.MaxDays != null) khi được duyệt
    ///    phải sinh giao dịch "Deduct" trong LeaveLedger (idempotent
    ///    theo (LeaveRequestId)). Khi hủy, sinh "Refund".
    /// </para>
    /// </summary>
    public class DecisionLeaveRequestModelView
    {
        /// <summary>Lý do / ghi chú khi từ chối (không bắt buộc).</summary>
        [MaxLength(500)]
        public string? Note { get; set; }
    }

    // ===== Cancel (hủy đơn) =====
    /// <summary>
    /// Body cho endpoint hủy đơn. Chỉ cho khi đơn đang Pending.
    /// Chủ đơn có quyền hủy; Admin cũng được.
    /// Khi hủy: (a) revert trạng thái → Cancelled, (b) nếu trước đó
    /// đã có Deduct ledger (do lỗi/rollback admin), sinh Refund.
    /// </summary>
    public class CancelLeaveRequestModelView
    {
        [MaxLength(500)]
        public string? Reason { get; set; }
    }
}
