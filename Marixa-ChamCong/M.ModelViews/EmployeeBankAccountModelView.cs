using System.ComponentModel.DataAnnotations;

namespace ModelViews.EmployeeBankAccountModelView
{
    public class EmployeeBankAccountResponseModelView
    {
        public Guid Id { get; set; }

        public Guid EmployeeId { get; set; }

        public string? EmployeeName { get; set; }

        public Guid BankId { get; set; }

        public string? BankName { get; set; }

        public string AccountNumber { get; set; } = string.Empty;

        public string? AccountHolderName { get; set; }

        public bool IsPrimary { get; set; }

        public int Status { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreateEmployeeBankAccountModelView
    {
        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public Guid BankId { get; set; }

        [Required]
        [MaxLength(50)]
        public string AccountNumber { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? AccountHolderName { get; set; }

        public bool IsPrimary { get; set; }

        public int Status { get; set; } = 1;
    }


    public class UpdateEmployeeBankAccountModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public Guid BankId { get; set; }

        [Required]
        [MaxLength(50)]
        public string AccountNumber { get; set; } = string.Empty;

        [MaxLength(150)]
        public string? AccountHolderName { get; set; }

        public bool IsPrimary { get; set; }

        public int Status { get; set; }
    }
}