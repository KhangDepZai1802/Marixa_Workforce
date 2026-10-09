using M.Core.Base;
using System.ComponentModel.DataAnnotations;

namespace M.Contract.Repositories.Entities;

// ===== THÀNH VIÊN DỰ ÁN (Work Project Member) =====
public class WorkProjectMember : BaseEntity
{
    [Required] public Guid ProjectId { get; set; }
    [Required] public Guid EmployeeId { get; set; }
    [Required, MaxLength(50)] public string EmployeeCode { get; set; } = "";
    [Required, MaxLength(150)] public string EmployeeName { get; set; } = "";

    public virtual WorkProject Project { get; set; } = null!;
    public virtual Employee Employee { get; set; } = null!;
}
