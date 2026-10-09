using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.EmployeeSalaryModelView
{
    public class EmployeeSalaryResponseModelView
    {
        public Guid Id { get; set; }

        public Guid EmployeeId { get; set; }

        public string? EmployeeName { get; set; }

        public Guid? SalaryGroupId { get; set; }

        public string? SalaryGroupName { get; set; }

        public SalaryPaymentType PaymentType { get; set; }

        public decimal BasicSalary { get; set; }

        public decimal DailyRate { get; set; }

        public decimal PositionAllowance { get; set; }

        public decimal OtherAllowance { get; set; }

        public decimal Bonus { get; set; }

        public decimal SocialInsuranceSalary { get; set; }

        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreateEmployeeSalaryModelView
    {
        [Required]
        public Guid EmployeeId { get; set; }

        public Guid? SalaryGroupId { get; set; }

        [Required]
        public SalaryPaymentType PaymentType { get; set; }

        public decimal BasicSalary { get; set; }

        public decimal DailyRate { get; set; }

        public decimal PositionAllowance { get; set; }

        public decimal OtherAllowance { get; set; }

        public decimal Bonus { get; set; }

        public decimal SocialInsuranceSalary { get; set; }

        [Required]
        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }
    }


    public class UpdateEmployeeSalaryModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        public Guid? SalaryGroupId { get; set; }

        [Required]
        public SalaryPaymentType PaymentType { get; set; }

        public decimal BasicSalary { get; set; }

        public decimal DailyRate { get; set; }

        public decimal PositionAllowance { get; set; }

        public decimal OtherAllowance { get; set; }

        public decimal Bonus { get; set; }

        public decimal SocialInsuranceSalary { get; set; }

        [Required]
        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }
    }
}