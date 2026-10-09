using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.EmployeeModelView
{
    public class EmployeeResponseModelView
    {
        public Guid Id { get; set; }

        public string EmployeeCode { get; set; } = string.Empty;

        public string GivenName { get; set; } = string.Empty;

        public string FamilyName { get; set; } = string.Empty;

        public string FullName => $"{GivenName} {FamilyName}".Trim();

        public DateTime? BirthDate { get; set; }

        public GenderType Gender { get; set; }

        public string? CitizenId { get; set; }

        public DateTime? CitizenIdIssuedDate { get; set; }

        public string? CitizenIdIssuedPlace { get; set; }

        public string? PhoneNumber { get; set; }

        public string? Email { get; set; }

        public string? PermanentAddress { get; set; }

        public string? CurrentAddress { get; set; }

        public Guid? UserId { get; set; }

        public Guid? DepartmentId { get; set; }

        public Guid? DepartmentManagerId { get; set; }

        public string? DepartmentName { get; set; }

        public Guid? PositionId { get; set; }

        public string? PositionName { get; set; }

        public Guid? ManagerId { get; set; }

        public string? ManagerName { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? ProbationEndDate { get; set; }

        public LaborType LaborType { get; set; }

        public EmployeeStatus Status { get; set; }

        public bool UsePhoneAttendance { get; set; }

        public string? Note { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreateEmployeeModelView
    {
        [Required]
        [MaxLength(50)]
        public string EmployeeCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string GivenName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string FamilyName { get; set; } = string.Empty;

        public DateTime? BirthDate { get; set; }

        public GenderType Gender { get; set; } = GenderType.RatherNotSay;

        [MaxLength(20)]
        public string? CitizenId { get; set; }

        public DateTime? CitizenIdIssuedDate { get; set; }

        [MaxLength(255)]
        public string? CitizenIdIssuedPlace { get; set; }

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [EmailAddress]
        [MaxLength(150)]
        public string? Email { get; set; }

        public string? PermanentAddress { get; set; }

        public string? CurrentAddress { get; set; }

        public Guid? UserId { get; set; }

        public Guid? DepartmentId { get; set; }

        public Guid? PositionId { get; set; }

        public Guid? ManagerId { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? ProbationEndDate { get; set; }

        public LaborType LaborType { get; set; } = LaborType.FullTime;

        public EmployeeStatus Status { get; set; } = EmployeeStatus.Probation;

        public bool UsePhoneAttendance { get; set; }

        public string? Note { get; set; }
    }


    public class UpdateEmployeeModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string EmployeeCode { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string GivenName { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string FamilyName { get; set; } = string.Empty;

        public DateTime? BirthDate { get; set; }

        public GenderType Gender { get; set; }

        [MaxLength(20)]
        public string? CitizenId { get; set; }

        public DateTime? CitizenIdIssuedDate { get; set; }

        [MaxLength(255)]
        public string? CitizenIdIssuedPlace { get; set; }

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        [EmailAddress]
        [MaxLength(150)]
        public string? Email { get; set; }

        public string? PermanentAddress { get; set; }

        public string? CurrentAddress { get; set; }

        public Guid? UserId { get; set; }

        public Guid? DepartmentId { get; set; }

        public Guid? PositionId { get; set; }

        public Guid? ManagerId { get; set; }

        public DateTime? StartDate { get; set; }

        public DateTime? ProbationEndDate { get; set; }

        public LaborType LaborType { get; set; }

        public EmployeeStatus Status { get; set; }

        public bool UsePhoneAttendance { get; set; }

        public string? Note { get; set; }
    }
}
