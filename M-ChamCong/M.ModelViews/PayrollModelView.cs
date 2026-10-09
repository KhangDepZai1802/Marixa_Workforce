using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.PayrollModelView
{
    public class PayrollResponseModelView
    {
        public Guid Id { get; set; }

        public Guid EmployeeId { get; set; }

        public string? EmployeeName { get; set; }

        public DateTime PayrollMonth { get; set; }

        public decimal BasicSalary { get; set; }

        public decimal Allowance { get; set; }

        public decimal Bonus { get; set; }

        public decimal Overtime { get; set; }

        public decimal Insurance { get; set; }

        public decimal Tax { get; set; }

        public decimal Deduction { get; set; }

        public decimal NetSalary { get; set; }

        public PayrollStatus Status { get; set; }

        public DateTime? PayDate { get; set; }

        public PaymentMethod PaymentMethod { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreatePayrollModelView
    {
        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public DateTime PayrollMonth { get; set; }

        public decimal BasicSalary { get; set; }

        public decimal Allowance { get; set; }

        public decimal Bonus { get; set; }

        public decimal Overtime { get; set; }

        public decimal Insurance { get; set; }

        public decimal Tax { get; set; }

        public decimal Deduction { get; set; }

        public decimal NetSalary { get; set; }

        public PayrollStatus Status { get; set; } = PayrollStatus.Draft;

        public DateTime? PayDate { get; set; }

        public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.BankTransfer;
    }


    public class UpdatePayrollModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public DateTime PayrollMonth { get; set; }

        public decimal BasicSalary { get; set; }

        public decimal Allowance { get; set; }

        public decimal Bonus { get; set; }

        public decimal Overtime { get; set; }

        public decimal Insurance { get; set; }

        public decimal Tax { get; set; }

        public decimal Deduction { get; set; }

        public decimal NetSalary { get; set; }

        public PayrollStatus Status { get; set; }

        public DateTime? PayDate { get; set; }

        public PaymentMethod PaymentMethod { get; set; }
    }
}
