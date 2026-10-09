using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.EmployeeInsuranceModelView
{
    public class EmployeeInsuranceResponseModelView
    {
        public Guid Id { get; set; }

        public Guid EmployeeId { get; set; }

        public string? EmployeeName { get; set; }

        public string? SocialInsuranceNumber { get; set; }

        public string? HealthInsuranceNumber { get; set; }

        public string? PersonalTaxCode { get; set; }

        public bool IsSocialInsuranceParticipant { get; set; }

        public DateTime? ParticipationStartDate { get; set; }

        public DateTime? ParticipationEndDate { get; set; }

        public decimal SocialInsuranceSalary { get; set; }

        public InsuranceStatus Status { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreateEmployeeInsuranceModelView
    {
        [Required]
        public Guid EmployeeId { get; set; }

        [MaxLength(50)]
        public string? SocialInsuranceNumber { get; set; }

        [MaxLength(50)]
        public string? HealthInsuranceNumber { get; set; }

        [MaxLength(50)]
        public string? PersonalTaxCode { get; set; }

        public bool IsSocialInsuranceParticipant { get; set; }

        public DateTime? ParticipationStartDate { get; set; }

        public DateTime? ParticipationEndDate { get; set; }

        public decimal SocialInsuranceSalary { get; set; }

        public InsuranceStatus Status { get; set; } = InsuranceStatus.Active;
    }


    public class UpdateEmployeeInsuranceModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        [MaxLength(50)]
        public string? SocialInsuranceNumber { get; set; }

        [MaxLength(50)]
        public string? HealthInsuranceNumber { get; set; }

        [MaxLength(50)]
        public string? PersonalTaxCode { get; set; }

        public bool IsSocialInsuranceParticipant { get; set; }

        public DateTime? ParticipationStartDate { get; set; }

        public DateTime? ParticipationEndDate { get; set; }

        public decimal SocialInsuranceSalary { get; set; }

        public InsuranceStatus Status { get; set; }
    }
}
