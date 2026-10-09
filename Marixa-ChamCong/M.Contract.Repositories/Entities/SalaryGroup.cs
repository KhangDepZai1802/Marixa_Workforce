using M.Core.Base;
using System.ComponentModel.DataAnnotations;

namespace M.Contract.Repositories.Entities
{
    public class SalaryGroup : BaseEntity
    {
        // Mã nhóm lương, bắt buộc và tối đa 50 ký tự
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        // Tên nhóm lương, bắt buộc và tối đa 150 ký tự
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        // Mô tả (có thể để trống)
        public string? Description { get; set; }

        // Cờ cho biết nhóm lương còn hiệu lực hay không (mặc định true)
        public bool IsActive { get; set; } = true;

        // Quan hệ một-nhiều: một `SalaryGroup` có thể liên kết nhiều `EmployeeSalary`.
        // `virtual` hỗ trợ khả năng lazy loading nếu EF Core được cấu hình.
        // Khởi tạo một collection rỗng để tránh null reference khi truy cập.
        public virtual ICollection<EmployeeSalary> EmployeeSalaries { get; set; }
            = new List<EmployeeSalary>();
    }
}
