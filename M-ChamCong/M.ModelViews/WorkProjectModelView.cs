namespace ModelViews.WorkProjectModelView
{
    public class WorkProjectRow
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? FileName { get; set; }
        public string? FileUrl { get; set; }
        public string? Color { get; set; }
        public string OwnerEmployeeCode { get; set; } = "";
        public string OwnerName { get; set; } = "";
        public int Status { get; set; }
        public int MemberCount { get; set; }
        public int TaskTotal { get; set; }
        public int TaskDone { get; set; }
        public List<WorkProjectMemberRow> Members { get; set; } = new();
    }

    public class WorkProjectMemberRow
    {
        public Guid Id { get; set; }
        public string EmployeeCode { get; set; } = "";
        public string Name { get; set; } = "";
        public string? PositionName { get; set; }
    }

    public class SelectableEmployeeRow
    {
        public Guid Id { get; set; }
        public string EmployeeCode { get; set; } = "";
        public string Name { get; set; } = "";
        public string? DepartmentName { get; set; }
        public string? PositionName { get; set; }
        public string Level { get; set; } = ""; // "subordinate"
    }

    public class CreateWorkProjectModelView
    {
        public string Name { get; set; } = "";
        public string? Description { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Color { get; set; }
        public List<Guid> MemberIds { get; set; } = new();
        public string? FileName { get; set; }
        public string? FileUrl { get; set; }
    }
}
