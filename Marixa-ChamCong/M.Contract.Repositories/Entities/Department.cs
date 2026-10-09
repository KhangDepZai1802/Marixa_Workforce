using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    public class Department : BaseEntity
    {
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        // Tên phòng ban, bắt buộc, tối đa 150 ký tự
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        // Mô tả phòng ban (có thể null)
        public string? Description { get; set; }

        // Khóa ngoại tới nhân viên quản lý (có thể null)
        public Guid? ManagerId { get; set; }

        // Điều hướng tới nhân viên quản lý
        [ForeignKey(nameof(ManagerId))]
        public virtual Employee? Manager { get; set; }

        // Cờ kích hoạt phòng ban
        public bool IsActive { get; set; } = true;

        // Danh sách nhân viên thuộc phòng ban
        public virtual ICollection<Employee> Employees { get; set; }
            = new List<Employee>();
    }
}
