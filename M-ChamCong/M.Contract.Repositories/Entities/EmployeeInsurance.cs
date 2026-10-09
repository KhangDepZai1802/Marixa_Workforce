using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    public class EmployeeInsurance : BaseEntity
    {
        [Required]
        public Guid EmployeeId { get; set; }

        // Điều hướng tới Employee
        [ForeignKey(nameof(EmployeeId))]
        public virtual Employee? Employee { get; set; }

        // Số BHXH
        [MaxLength(50)]
        public string? SocialInsuranceNumber { get; set; }

        // Số bảo hiểm y tế
        [MaxLength(50)]
        public string? HealthInsuranceNumber { get; set; }

        // Mã số thuế cá nhân
        [MaxLength(50)]
        public string? PersonalTaxCode { get; set; }

        // Có tham gia BHXH hay không
        public bool IsSocialInsuranceParticipant { get; set; } = false;

        // Thời gian bắt đầu tham gia
        public DateTime? ParticipationStartDate { get; set; }

        // Thời gian kết thúc tham gia
        public DateTime? ParticipationEndDate { get; set; }

        // Mức lương để tính bảo hiểm
        [Column(TypeName = "decimal(18,2)")]
        public decimal SocialInsuranceSalary { get; set; } = 0;

        // Trạng thái tham gia bảo hiểm (mặc định Active)
        [Required]
        public InsuranceStatus Status { get; set; } = InsuranceStatus.Active;
    }

    /// <summary>
    /// Trạng thái tham gia bảo hiểm (thay cho int cũ).
    /// </summary>
    public enum InsuranceStatus
    {
        Active = 1,       // Đang đóng
        Suspended = 2,    // Tạm dừng
        Closed = 3        // Đã chốt sổ
    }
}
