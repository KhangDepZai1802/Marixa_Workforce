using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.EmployeeContractModelView
{
    public class EmployeeContractResponseModelView
    {
        public Guid Id { get; set; }

        public Guid EmployeeId { get; set; }

        public string? EmployeeName { get; set; }

        public string ContractNumber { get; set; } = string.Empty;

        public ContractType ContractType { get; set; }

        public DateTime StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public string? Note { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreateEmployeeContractModelView
    {
        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        [MaxLength(100)]
        public string ContractNumber { get; set; } = string.Empty;

        [Required]
        public ContractType ContractType { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public string? Note { get; set; }
    }


    public class UpdateEmployeeContractModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        [MaxLength(100)]
        public string ContractNumber { get; set; } = string.Empty;

        [Required]
        public ContractType ContractType { get; set; }

        [Required]
        public DateTime StartDate { get; set; }

        public DateTime? EndDate { get; set; }

        public string? Note { get; set; }
    }
}