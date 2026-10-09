using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    public class LeaveType : BaseEntity
    {
        // Mã loại nghỉ phép
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        // Tên loại nghỉ phép
        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        // Số ngày tối đa (nếu có)
        [Column(TypeName = "decimal(10,2)")]
        public decimal? MaxDays { get; set; }

        // Có trả lương hay không
        public bool IsPaid { get; set; } = true;

        // Cờ kích hoạt loại nghỉ phép
        public bool IsActive { get; set; } = true;

        // Danh sách yêu cầu nghỉ phép thuộc loại này
        public virtual ICollection<LeaveRequest> LeaveRequests { get; set; }
            = new List<LeaveRequest>();
    }
}
