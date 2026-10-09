namespace ModelViews.WorkPerformanceModelView
{
    public class WorkPerformanceRow
    {
        public Guid Id { get; set; }
        public Guid EmployeeId { get; set; }
        public Guid RatedById { get; set; }
        public string EmployeeEmployeeCode { get; set; } = "";
        public string EmployeeName { get; set; } = "";
        public string RatedByName { get; set; } = "";
        public string Period { get; set; } = "";
        public string PeriodLabel { get; set; } = "";
        public int Quality { get; set; }
        public int Timeliness { get; set; }
        public int Collaboration { get; set; }
        public int Initiation { get; set; }
        public int Average { get; set; }
        public string? Strengths { get; set; }
        public string? Improvements { get; set; }
        public string? OverallComment { get; set; }
        public int Status { get; set; }
        public string? EmployeeConfirmedByName { get; set; }
        public DateTime? EmployeeConfirmedAt { get; set; }
        public DateTimeOffset CreatedTime { get; set; }
    }

    public class CreateWorkPerformanceModelView
    {
        public Guid EmployeeId { get; set; }
        public string Period { get; set; } = "";        // "2026-10"
        public string PeriodLabel { get; set; } = "";   // "Tháng 10/2026"
        public int Quality { get; set; }
        public int Timeliness { get; set; }
        public int Collaboration { get; set; }
        public int Initiation { get; set; }
        public string? Strengths { get; set; }
        public string? Improvements { get; set; }
        public string? OverallComment { get; set; }
        public bool Submit { get; set; }                // true = gửi, false = lưu dự thảo
    }

    public class ConfirmWorkPerformanceModelView
    {
        public bool Confirm { get; set; }
        public string? Comment { get; set; }
    }
}
