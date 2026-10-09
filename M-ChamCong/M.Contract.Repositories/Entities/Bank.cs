using M.Core.Base;
using System.ComponentModel.DataAnnotations;

namespace M.Contract.Repositories.Entities
{
    public class Bank : BaseEntity
    {
        // Mã ngân hàng, bắt buộc, tối đa 50 ký tự
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        // Tên ngân hàng, bắt buộc, tối đa 150 ký tự
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        // Tên viết tắt (có thể null)
        [MaxLength(50)]
        public string? ShortName { get; set; }

        // Cờ kích hoạt
        public bool IsActive { get; set; } = true;

        // Danh sách tài khoản nhân viên liên quan
        public virtual ICollection<EmployeeBankAccount> EmployeeBankAccounts { get; set; }
            = new List<EmployeeBankAccount>();
    }
}
