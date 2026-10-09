using M.Core.Base;
using System.ComponentModel.DataAnnotations;

namespace M.Contract.Repositories.Entities;

public class EmployeeHandover : BaseEntity
{
    [Required] public Guid EmployeeId { get; set; }
    [Required] public Guid ManagerId { get; set; }
    [Required] public DateTime LastWorkingDate { get; set; }
    [Required, MaxLength(2000)] public string Reason { get; set; } = string.Empty;
    [MaxLength(4000)] public string? CompanyAssets { get; set; }
    [Required, MaxLength(4000)] public string WorkProgress { get; set; } = string.Empty;
    [Required] public string AssetsJson { get; set; } = "[]";
    [Required] public string ProjectsJson { get; set; } = "[]";
    public bool AccountIssued { get; set; }
    public int Status { get; set; }
    [MaxLength(2000)] public string? ReviewNote { get; set; }
    public Guid? ReviewedByEmployeeId { get; set; }
    [MaxLength(150)] public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAt { get; set; }
}

public static class EmployeeHandoverStatus
{
    public const int Pending = 0;
    public const int Approved = 1;
    public const int Rejected = 2;
}
