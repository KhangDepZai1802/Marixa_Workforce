using M.Contract.Repositories.Entities;

namespace ModelViews.WorkTaskModelView
{
    public class WorkTaskRow
    {
        public Guid Id { get; set; }
        public Guid AssigneeId { get; set; }
        public Guid AssignedById { get; set; }
        public string AssigneeEmployeeCode { get; set; } = "";
        public string AssigneeName { get; set; } = "";
        public string AssignedByName { get; set; } = "";
        public string Title { get; set; } = "";
        public string? Description { get; set; }
        public int Priority { get; set; }
        public int Status { get; set; }
        public string StatusLabel { get; set; } = "";
        public DateTime DueDate { get; set; }
        public DateTime? CompletedAt { get; set; }
        public int ProgressPercent { get; set; }
        public int CommentCount { get; set; }
        public DateTimeOffset CreatedTime { get; set; }
        public DateTimeOffset LastUpdatedTime { get; set; }
    }

    public class AssignableEmployeeRow
    {
        public Guid Id { get; set; }
        public string EmployeeCode { get; set; } = "";
        public string Name { get; set; } = "";
        public string? DepartmentName { get; set; }
        public string? PositionName { get; set; }
    }

    public class CreateWorkTaskModelView
    {
        public Guid AssigneeId { get; set; }
        public string Title { get; set; } = "";
        public string? Description { get; set; }
        public int Priority { get; set; } = 1;
        public DateTime DueDate { get; set; } = DateTime.UtcNow.AddDays(7);
    }

    public class MoveWorkTaskModelView
    {
        public int Status { get; set; }
        public int ProgressPercent { get; set; }
    }

    public class WorkTaskCommentRow
    {
        public Guid Id { get; set; }
        public Guid TaskId { get; set; }
        public Guid AuthorEmployeeId { get; set; }
        public string AuthorName { get; set; } = "";
        public string Content { get; set; } = "";
        public DateTimeOffset CreatedTime { get; set; }
    }

    public class CreateWorkTaskCommentModelView
    {
        public string Content { get; set; } = "";
    }
}
