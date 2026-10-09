using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    /// <summary>
    /// Bảng liên kết: gán ca làm việc cho nhân viên theo thời hạn hiệu lực.
    /// Dùng để lập kế hoạch chấm công (ai làm ca nào, từ ngày nào đến ngày nào).
    /// </summary>
    public class EmployeeShift : BaseEntity
    {
        // Khóa ngoại tới nhân viên (bắt buộc)
        [Required]
        public Guid EmployeeId { get; set; }

        [ForeignKey(nameof(EmployeeId))]
        public virtual Employee? Employee { get; set; }

        // Khóa ngoại tới ca làm việc (bắt buộc)
        [Required]
        public Guid ShiftId { get; set; }

        [ForeignKey(nameof(ShiftId))]
        public virtual Shift? Shift { get; set; }

        // Ca có hiệu lực từ ngày
        [Required]
        public DateTime EffectiveFrom { get; set; }

        // Ca có hiệu lực tới ngày (nếu null = không xác định)
        public DateTime? EffectiveTo { get; set; }

        // Ghi chú
        public string? Note { get; set; }
    }
}
