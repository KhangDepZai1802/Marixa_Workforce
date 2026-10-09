using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities;

public class EmployeeReport : BaseEntity
{
    [Required, MaxLength(30)] public string ReportCode { get; set; } = string.Empty;
    [Required, MaxLength(200)] public string Title { get; set; } = string.Empty;
    [Required, MaxLength(80)] public string ReportType { get; set; } = string.Empty;
    public DateTime Period { get; set; }
    public DateTime? Deadline { get; set; }
    [Required] public Guid EmployeeId { get; set; }
    [ForeignKey(nameof(EmployeeId))] public Employee? Employee { get; set; }
    public int Status { get; set; }
    public DateTime SubmittedAt { get; set; }
    public Guid? ReviewedBy { get; set; }
    public DateTime? ReviewedAt { get; set; }
    [MaxLength(2000)] public string? ManagerComment { get; set; }
    [MaxLength(6000)] public string? Overview { get; set; }
    [MaxLength(6000)] public string? Results { get; set; }
    [MaxLength(6000)] public string? Issues { get; set; }
    [MaxLength(6000)] public string? Recommendations { get; set; }
    public string? UpperFileName { get; set; }
    public string? UpperStoredName { get; set; }
    public long? UpperFileSize { get; set; }
    [MaxLength(2000)] public string? UpperNote { get; set; }
    [MaxLength(200)] public string? UpperRecipient { get; set; }
    public Guid? UpperRecipientEmployeeId { get; set; }
    [MaxLength(2000)] public string? UpperRequest { get; set; }
    public DateTime? UpperRequestDeadline { get; set; }
    public bool SentToUpper { get; set; }
    public DateTime? SentToUpperAt { get; set; }
    public Guid? SentToUpperBy { get; set; }
    public ICollection<EmployeeReportVersion> Versions { get; set; } = new List<EmployeeReportVersion>();
    public ICollection<EmployeeReportEvent> Events { get; set; } = new List<EmployeeReportEvent>();
}

public class EmployeeReportVersion : BaseEntity
{
    public Guid ReportId { get; set; }
    public EmployeeReport? Report { get; set; }
    public int Version { get; set; }
    [Required, MaxLength(255)] public string FileName { get; set; } = string.Empty;
    [Required, MaxLength(255)] public string StoredName { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public Guid UploadedBy { get; set; }
    public DateTime UploadedAt { get; set; }
    public ICollection<EmployeeReportAttachment> Attachments { get; set; } = new List<EmployeeReportAttachment>();
}

public class EmployeeReportAttachment : BaseEntity
{
    public Guid VersionId { get; set; }
    public EmployeeReportVersion? Version { get; set; }
    [Required, MaxLength(255)] public string FileName { get; set; } = string.Empty;
    [Required, MaxLength(255)] public string StoredName { get; set; } = string.Empty;
    public long FileSize { get; set; }
}

public class EmployeeReportEvent : BaseEntity
{
    public Guid ReportId { get; set; }
    public EmployeeReport? Report { get; set; }
    [Required, MaxLength(50)] public string ActionName { get; set; } = string.Empty;
    [MaxLength(2000)] public string? Comment { get; set; }
    [MaxLength(200)] public string? Recipient { get; set; }
    public Guid? ActorId { get; set; }
    [MaxLength(200)] public string ActorName { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
    public DateTime? Deadline { get; set; }
}

public static class EmployeeReportStatus
{
    public const int PendingManager = 0;
    public const int ManagerApproved = 1;
    public const int Rejected = 2;
    public const int ChangesRequested = 3;
    public const int SentToUpper = 4;
    public const int UpperApproved = 5;
    public const int UpperChangesRequested = 6;
    public const int Completed = 7;
}
