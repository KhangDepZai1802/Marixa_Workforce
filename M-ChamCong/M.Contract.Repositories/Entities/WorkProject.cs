using M.Core.Base;
using System.ComponentModel.DataAnnotations;

namespace M.Contract.Repositories.Entities;

// ===== DỰ ÁN / GÓI CÔNG VIỆC (Work Project) =====
// Manager tạo project, gán ngày, file đính kèm, và phân công cho cấp dưới.
public class WorkProject : BaseEntity
{
    [Required, MaxLength(300)] public string Name { get; set; } = "";
    [MaxLength(2000)] public string? Description { get; set; }
    [Required] public DateTime StartDate { get; set; }
    [Required] public DateTime EndDate { get; set; }
    public string? FileName { get; set; }
    public string? FileUrl { get; set; }

    // Người tạo (owner)
    [Required] public Guid OwnerEmployeeId { get; set; }
    [Required, MaxLength(50)] public string OwnerEmployeeCode { get; set; } = "";
    [Required, MaxLength(150)] public string OwnerName { get; set; } = "";

    // Màu chủ đạo của dự án (hex, vd "#2f6df6") - hiển thị trên card
    [MaxLength(20)] public string? Color { get; set; }

    // Status: 0=Active, 1=Completed, 2=Archived
    [Required] public int Status { get; set; }
    public int MemberCount { get; set; }
    public int TaskTotal { get; set; }
    public int TaskDone { get; set; }

    public virtual Employee Owner { get; set; } = null!;
    public virtual ICollection<WorkProjectMember> Members { get; set; } = new List<WorkProjectMember>();
}
