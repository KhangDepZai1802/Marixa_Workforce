using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    public class EmployeeSalary : BaseEntity
    {
        [Required]
        public Guid EmployeeId { get; set; }

        // Điều hướng tới Employee
        [ForeignKey(nameof(EmployeeId))]
        public virtual Employee? Employee { get; set; }

        // Nhóm lương (nếu có)
        public Guid? SalaryGroupId { get; set; }

        [ForeignKey(nameof(SalaryGroupId))]
        public virtual SalaryGroup? SalaryGroup { get; set; }

        // Hình thức trả lương (theo tháng, theo ngày...)
        [Required]
        public SalaryPaymentType PaymentType { get; set; }

        // Lương cơ bản
        [Column(TypeName = "decimal(18,2)")]
        public decimal BasicSalary { get; set; } = 0;

        // Lương theo ngày (nếu áp dụng)
        [Column(TypeName = "decimal(18,2)")]
        public decimal DailyRate { get; set; } = 0;

        // Phụ cấp chức vụ
        [Column(TypeName = "decimal(18,2)")]
        public decimal PositionAllowance { get; set; } = 0;

        // Phụ cấp khác
        [Column(TypeName = "decimal(18,2)")]
        public decimal OtherAllowance { get; set; } = 0;

        // Thưởng
        [Column(TypeName = "decimal(18,2)")]
        public decimal Bonus { get; set; } = 0;

        // Mức lương để tính bảo hiểm
        [Column(TypeName = "decimal(18,2)")]
        public decimal SocialInsuranceSalary { get; set; } = 0;

        // Hiệu lực từ ngày
        [Required]
        public DateTime EffectiveFrom { get; set; }

        // Hiệu lực tới ngày (nếu có)
        public DateTime? EffectiveTo { get; set; }
    }

    // Hình thức trả lương
    public enum SalaryPaymentType
    {
        Monthly = 1,
        Daily = 2,
        Hourly = 3,
        Product = 4
    }
}


