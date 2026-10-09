using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    public class EmployeeBankAccount : BaseEntity
    {
        // Khóa ngoại tới nhân viên
        [Required]
        public Guid EmployeeId { get; set; }

        // Điều hướng tới Employee
        [ForeignKey(nameof(EmployeeId))]
        public virtual Employee? Employee { get; set; }

        // Khóa ngoại tới ngân hàng
        [Required]
        public Guid BankId { get; set; }

        // Điều hướng tới Bank
        [ForeignKey(nameof(BankId))]
        public virtual Bank? Bank { get; set; }

        // Số tài khoản, bắt buộc
        [Required]
        [MaxLength(50)]
        public string AccountNumber { get; set; } = string.Empty;

        // Tên chủ tài khoản (có thể null)
        [MaxLength(150)]
        public string? AccountHolderName { get; set; }

        // Có phải tài khoản chính không
        public bool IsPrimary { get; set; } = false;

        // Trạng thái tài khoản: 1 = Đang dùng, 0 = Đã ngưng
        public int Status { get; set; } = 1;
    }
}
