using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.LeaveLedgerModelView
{
    /// <summary>
    /// Trả về 1 giao dịch sổ phép (dùng cho list lịch sử số dư).
    /// </summary>
    public class LeaveLedgerResponseModelView
    {
        public Guid Id { get; set; }

        public Guid EmployeeId { get; set; }
        public string? EmployeeCode { get; set; }
        public string? EmployeeName { get; set; }

        public int Year { get; set; }

        public Guid? LeaveTypeId { get; set; }
        public string? LeaveTypeCode { get; set; }
        public string? LeaveTypeName { get; set; }

        public LeaveLedgerEntryType EntryType { get; set; }
        public decimal Days { get; set; }

        public Guid? LeaveRequestId { get; set; }
        public string? LeaveRequestReason { get; set; }

        public string? Reason { get; set; }

        public DateTimeOffset CreatedTime { get; set; }
        public string? CreatedBy { get; set; }
    }


    /// <summary>
    /// Số dư phép theo năm (tổng các giao dịch) cho 1 nhân viên.
    /// </summary>
    public class LeaveLedgerSummaryModelView
    {
        public Guid EmployeeId { get; set; }
        public int Year { get; set; }

        // Tổng đã cấp (Grant + Adjust dương)
        public decimal TotalGranted { get; set; }
        // Tổng đã trừ (Deduct)
        public decimal TotalUsed { get; set; }
        // Số dư còn lại
        public decimal Remaining { get; set; }
    }


    /// <summary>
    /// Ghi 1 giao dịch sổ phép (cấp/điều chỉnh/trừ/hoàn).
    /// </summary>
    public class CreateLeaveLedgerEntryModelView
    {
        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public int Year { get; set; }

        public Guid? LeaveTypeId { get; set; }

        [Required]
        public LeaveLedgerEntryType EntryType { get; set; }

        // Số ngày (mức tuyệt đối, dương)
        [Required]
        [Range(0.01, 999)]
        public decimal Days { get; set; }

        // Mối nối về đơn nghỉ phép (idempotent)
        public Guid? LeaveRequestId { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }
    }
}
