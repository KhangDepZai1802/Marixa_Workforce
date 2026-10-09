using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    public class EmployeeDependent : BaseEntity
    {
        // Khóa ngoại tới nhân viên chủ
        [Required]
        public Guid EmployeeId { get; set; }

        // Điều hướng tới Employee
        [ForeignKey(nameof(EmployeeId))]
        public virtual Employee? Employee { get; set; }

        // Tên
        [Required]
        [MaxLength(100)]
        public string GivenName { get; set; } = string.Empty;

        // Họ
        [Required]
        [MaxLength(100)]
        public string FamilyName { get; set; } = string.Empty;

        // FullName không lưu vào DB
        [NotMapped]
        public string FullName => $"{GivenName} {FamilyName}".Trim();

        // Quan hệ với nhân viên (ví dụ: Con, Vợ)
        [MaxLength(50)]
        public string? Relationship { get; set; }

        // Ngày sinh
        public DateTime? BirthDate { get; set; }

        // Số CCCD của người phụ thuộc (nếu có)
        [MaxLength(20)]
        public string? CitizenId { get; set; }

        // Mã số thuế cá nhân (nếu có)
        [MaxLength(50)]
        public string? TaxIdentificationNumber { get; set; }

        // Khoảng thời gian hưởng quyền lợi
        public DateTime? EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        // Trạng thái (mặc định 1)
        public int Status { get; set; } = 1;
    }
}
