using M.Core.Base;
using System.ComponentModel.DataAnnotations;

namespace M.Contract.Repositories.Entities
{
    public class Position : BaseEntity
    {
        // Mã chức vụ
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        // Tên chức vụ
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        // Mô tả chức vụ
        public string? Description { get; set; }

        // Cờ kích hoạt
        public bool IsActive { get; set; } = true;

        // Danh sách nhân viên giữ chức vụ này
        public virtual ICollection<Employee> Employees { get; set; }
            = new List<Employee>();
    }
}
