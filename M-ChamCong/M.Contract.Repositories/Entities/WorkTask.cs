using M.Core.Base;
using System.ComponentModel.DataAnnotations;

namespace M.Contract.Repositories.Entities;

// ===== Quà / Nhiệm vụ giao việc =====
// Manager / Admin giao việc cho nhân viên; nhân viên theo dõi & kéo-thả trạng thái.
public class WorkTask : BaseEntity
{
    [Required] public Guid AssigneeId { get; set; }            // nhân viên nhận việc (EmployeeId)
    [Required] public Guid AssignedById { get; set; }          // người giao (EmployeeId của manager/admin)
    [Required, MaxLength(50)] public string AssigneeEmployeeCode { get; set; } = string.Empty;
    [Required, MaxLength(150)] public string AssigneeName { get; set; } = string.Empty;
    [Required, MaxLength(150)] public string AssignedByName { get; set; } = string.Empty;

    [Required, MaxLength(300)] public string Title { get; set; } = string.Empty;
    [MaxLength(2000)] public string? Description { get; set; }
    // Priority: 0=Thấp, 1=Trung bình, 2=Cao, 3=Khẩn
    [Required] public int Priority { get; set; }
    // Status: 0=Todo, 1=In Progress, 2=Done, 3=Blocked
    [Required] public int Status { get; set; }
    [Required, MaxLength(300)] public string CurrentStatusLabel { get; set; } = string.Empty;

    [Required] public DateTime DueDate { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int ProgressPercent { get; set; }

    public virtual Employee AssignedBy { get; set; } = null!;
    public virtual Employee Assignee { get; set; } = null!;
    public virtual List<WorkTaskComment> Comments { get; set; } = new();
}

public static class WorkTaskStatus
{
    public const int Todo = 0;
    public const int InProgress = 1;
    public const int Done = 2;
    public const int Blocked = 3;

    public static string Label(int status) => status switch
    {
        Todo => "Todo",
        InProgress => "Đang làm",
        Done => "Hoàn thành",
        Blocked => "Bị chặn",
        _ => "Unknown",
    };
}

// ===== Comment trên nhiệm vụ =====
public class WorkTaskComment : BaseEntity
{
    [Required] public Guid TaskId { get; set; }
    [Required] public Guid AuthorEmployeeId { get; set; }
    [Required, MaxLength(150)] public string AuthorName { get; set; } = string.Empty;
    [Required, MaxLength(3000)] public string Content { get; set; } = string.Empty;

    public virtual WorkTask Task { get; set; } = null!;
}
