using M.Core.Base;
using System.ComponentModel.DataAnnotations;

namespace M.Contract.Repositories.Entities;

public class EmployeePromotion : BaseEntity
{
    [Required] public Guid EmployeeId { get; set; }
    [Required, MaxLength(50)] public string CurrentEmployeeCode { get; set; } = string.Empty;
    [MaxLength(150)] public string? CurrentPositionName { get; set; }
    [Required] public Guid NewPositionId { get; set; }
    [Required, MaxLength(150)] public string NewPositionName { get; set; } = string.Empty;
    [Required, MaxLength(50)] public string NewPositionCode { get; set; } = string.Empty;
    [MaxLength(50)] public string? NewEmployeeCode { get; set; }
    [Required, MaxLength(30)] public string TargetRoleName { get; set; } = "Employee";
    [Required] public Guid ProposedByUserId { get; set; }
    public Guid? ProposedByEmployeeId { get; set; }
    [Required, MaxLength(150)] public string ProposedByName { get; set; } = string.Empty;
    public int ProposalType { get; set; }
    [Required, MaxLength(2000)] public string Reason { get; set; } = string.Empty;
    [MaxLength(2000)] public string? AdditionalNote { get; set; }
    [MaxLength(2000)] public string? DecisionNote { get; set; }
    public DateTime EffectiveDate { get; set; }
    public int Status { get; set; }
    public Guid? ReviewedByUserId { get; set; }
    public Guid? ReviewedByEmployeeId { get; set; }
    [MaxLength(150)] public string? ReviewedByName { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public DateTime? AppliedAt { get; set; }
}

public static class EmployeePromotionType
{
    public const int EmployeeRequest = 1;
    public const int ManagerNomination = 2;
}

public static class EmployeePromotionStatus
{
    public const int Pending = 0;
    public const int Approved = 1;
    public const int Rejected = 2;
}
