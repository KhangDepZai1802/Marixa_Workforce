using M.Core.Base;
using System.ComponentModel.DataAnnotations;

namespace M.Contract.Repositories.Entities;

// ===== Đánh giá hiệu suất (KPI) =====
// Manager đánh giá nhân viên theo kỳ; lưu điểm + nhận xét + KPI.
public class WorkPerformance : BaseEntity
{
    [Required] public Guid EmployeeId { get; set; }
    [Required] public Guid RatedById { get; set; }            // người đánh giá (EmployeeId)
    [Required, MaxLength(50)] public string EmployeeEmployeeCode { get; set; } = string.Empty;
    [Required, MaxLength(150)] public string EmployeeName { get; set; } = string.Empty;
    [Required, MaxLength(150)] public string RatedByName { get; set; } = string.Empty;

    [Required, MaxLength(30)] public string Period { get; set; } = string.Empty;  // VD: "2026-10"
    [Required, MaxLength(50)] public string PeriodLabel { get; set; } = string.Empty;

    // Rating 1-5 cho từng nhóm KPI
    public int Quality { get; set; }          // Chất lượng (1-5)
    public int Timeliness { get; set; }       // Đúng hạn (1-5)
    public int Collaboration { get; set; }     // Phối hợp (1-5)
    public int Initiation { get; set; }        // Chủ động (1-5)

    [MaxLength(2000)] public string? Strengths { get; set; }
    [MaxLength(2000)] public string? Improvements { get; set; }
    [MaxLength(2000)] public string? OverallComment { get; set; }
    // Status: 0=Dự thảo, 1=Đã gửi, 2=Đã xác nhận
    [Required] public int Status { get; set; }
    public Guid? EmployeeConfirmedBy { get; set; }
    [MaxLength(150)] public string? EmployeeConfirmedByName { get; set; }
    public DateTime? EmployeeConfirmedAt { get; set; }

    public virtual Employee Employee { get; set; } = null!;
}

public static class WorkPerformanceStatus
{
    public const int Draft = 0;
    public const int Submitted = 1;
    public const int Confirmed = 2;

    public static int Average(WorkPerformance p)
    {
        int sum = p.Quality + p.Timeliness + p.Collaboration + p.Initiation;
        int count = 4;
        return sum / count == 0 && sum > 0 ? 1 : sum / count;
    }
}
