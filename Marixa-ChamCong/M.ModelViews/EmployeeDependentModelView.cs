using System.ComponentModel.DataAnnotations;

namespace ModelViews.EmployeeDependentModelView
{
    public class EmployeeDependentResponseModelView
    {
        public Guid Id { get; set; }

        public Guid EmployeeId { get; set; }

        public string? EmployeeName { get; set; }

        public string GivenName { get; set; } = string.Empty;

        public string FamilyName { get; set; } = string.Empty;

        public string FullName => $"{GivenName} {FamilyName}".Trim();

        public string? Relationship { get; set; }

        public DateTime? BirthDate { get; set; }

        public string? CitizenId { get; set; }

        public string? TaxIdentificationNumber { get; set; }

        public DateTime? EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        public int Status { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreateEmployeeDependentModelView
    {
        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        [MaxLength(150)]
        public string GivenName { get; set; } = string.Empty;

        public string FamilyName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Relationship { get; set; }

        public DateTime? BirthDate { get; set; }

        [MaxLength(20)]
        public string? CitizenId { get; set; }

        [MaxLength(50)]
        public string? TaxIdentificationNumber { get; set; }

        public DateTime? EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        public int Status { get; set; } = 1;
    }


    public class UpdateEmployeeDependentModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        [MaxLength(150)]
        public string GivenName { get; set; } = string.Empty;

        public string FamilyName { get; set; } = string.Empty;

        [MaxLength(50)]
        public string? Relationship { get; set; }

        public DateTime? BirthDate { get; set; }

        [MaxLength(20)]
        public string? CitizenId { get; set; }

        [MaxLength(50)]
        public string? TaxIdentificationNumber { get; set; }

        public DateTime? EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        public int Status { get; set; }
    }
}