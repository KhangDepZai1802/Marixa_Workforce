using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    /// <summary>
    /// Sổ giao dịch phép (leave ledger) theo quy định V1:
    /// "phép năm theo sổ giao dịch" — số dư được tính từ các giao dịch,
    /// không lưu sẵn số dư cố định. Mỗi giao dịch: cấp/chuyển/điều chỉnh/trừ/hoàn.
    /// </summary>
    public class LeaveLedger : BaseEntity
    {
        // Nhân viên sở hữu sổ phép
        [Required]
        public Guid EmployeeId { get; set; }

        [ForeignKey(nameof(EmployeeId))]
        public virtual Employee? Employee { get; set; }

        // Năm áp dụng (cột 01/01..31/12 của năm đó)
        [Required]
        public int Year { get; set; }

        // Loại nghỉ phép (để phân biệt sổ phép năm, phép vô thư, ...)
        public Guid? LeaveTypeId { get; set; }

        [ForeignKey(nameof(LeaveTypeId))]
        public virtual LeaveType? LeaveType { get; set; }

        // Loại giao dịch
        [Required]
        public LeaveLedgerEntryType EntryType { get; set; }

        // Số ngày (mức tuyệt đối, có dấu âm khi trừ)
        [Column(TypeName = "decimal(10,2)")]
        public decimal Days { get; set; } = 0;

        // Mối nối tới yêu cầu nghỉ phép (nếu có)
        public Guid? LeaveRequestId { get; set; }

        [ForeignKey(nameof(LeaveRequestId))]
        public virtual LeaveRequest? LeaveRequest { get; set; }

        // Ghi chú / lý do giao dịch
        [MaxLength(500)]
        public string? Reason { get; set; }
    }

    public enum LeaveLedgerEntryType
    {
        Grant = 1,      // Cấp phép (đầu năm hoặc điều chỉnh tăng)
        Adjust = 2,     // Điều chỉnh (thay đổi chính sách, trả phép, ...)
        Deduct = 3,     // Trừ (nghỉ phép đã duyệt)
        Refund = 4      // Hoàn (hủy/bổ sung sau khi trừ)
    }
}
