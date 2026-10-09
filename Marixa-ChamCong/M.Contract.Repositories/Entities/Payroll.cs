using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    public class Payroll : BaseEntity
    {
        // Khóa ngoại tới nhân viên
        [Required]
        public Guid EmployeeId { get; set; }

        // Điều hướng tới Employee
        [ForeignKey(nameof(EmployeeId))]
        public virtual Employee? Employee { get; set; }

        /// <summary>
        /// Ví dụ: 01/09/2026 đại diện cho kỳ lương tháng 09/2026.
        /// </summary>
        // Kỳ lương (thường lưu ngày bắt đầu tháng để đại diện tháng đó)
        [Required]
        public DateTime PayrollMonth { get; set; }

        // Các thành phần lương
        // Lương cơ bản
        [Column(TypeName = "decimal(18,2)")]
        public decimal BasicSalary { get; set; } = 0;

        // Tổng phụ cấp
        [Column(TypeName = "decimal(18,2)")]
        public decimal Allowance { get; set; } = 0;

        // Thưởng
        [Column(TypeName = "decimal(18,2)")]
        public decimal Bonus { get; set; } = 0;

        // Phụ cấp làm thêm giờ
        [Column(TypeName = "decimal(18,2)")]
        public decimal Overtime { get; set; } = 0;

        // Trừ bảo hiểm (BHXH + BHYT + BHTN do người lao động đóng)
        [Column(TypeName = "decimal(18,2)")]
        public decimal Insurance { get; set; } = 0;

        // Trừ thuế thu nhập cá nhân
        [Column(TypeName = "decimal(18,2)")]
        public decimal Tax { get; set; } = 0;

        // Trừ các khoản khác (vay, xử phạt...)
        [Column(TypeName = "decimal(18,2)")]
        public decimal Deduction { get; set; } = 0;

        // Lương thực nhận = các khoản cộng - các khoản trừ
        [Column(TypeName = "decimal(18,2)")]
        public decimal NetSalary { get; set; } = 0;

        // Trạng thái bảng lương (Draft, Calculated, Approved...)
        [Required]
        public PayrollStatus Status { get; set; } = PayrollStatus.Draft;

        // =========================================================
        // NGÀY & HÌNH THỨC TRẢ LƯƠNG
        // =========================================================

        // Ngày trả lương (mặc định null, xác định theo kỳ)
        public DateTime? PayDate { get; set; }

        // Hình thức trả lương (mặc định chuyển khoản)
        [Required]
        public PaymentMethod PaymentMethod { get; set; }
            = PaymentMethod.BankTransfer;
    }

    // Các trạng thái của bảng lương
    public enum PayrollStatus
    {
        Draft = 1,
        Calculated = 2,
        Approved = 3,
        Paid = 4,
        Cancelled = 5
    }

    // Hình thức trả lương
    public enum PaymentMethod
    {
        Cash = 1,
        BankTransfer = 2
    }
}
