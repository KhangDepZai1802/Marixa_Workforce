using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.AuditLogModelView
{
    /// <summary>
    /// Trả về 1 bản ghi audit log (list + detail).
    /// </summary>
    public class AuditLogResponseModelView
    {
        public Guid Id { get; set; }

        // Người thao tác
        public string? ActorUserName { get; set; }
        public Guid? ActorEmployeeId { get; set; }
        public string? ActorEmployeeCode { get; set; }
        public string? ActorEmployeeName { get; set; }

        // Nội dung
        public AuditAction Action { get; set; }
        public string EntityType { get; set; } = string.Empty;
        public Guid EntityId { get; set; }

        // Snapshot
        public string? BeforeJson { get; set; }
        public string? AfterJson { get; set; }
        public string? Reason { get; set; }

        // Timestamps
        public DateTimeOffset CreatedTime { get; set; }
    }

    /// <summary>
    /// Tạo một bản ghi audit log (ghi bởi service, không qua user input trực tiếp).
    /// </summary>
    public class CreateAuditLogModelView
    {
        [Required]
        public AuditAction Action { get; set; }

        [Required]
        [MaxLength(64)]
        public string EntityType { get; set; } = string.Empty;

        [Required]
        public Guid EntityId { get; set; }

        [MaxLength(128)]
        public string? ActorUserName { get; set; }

        public Guid? ActorEmployeeId { get; set; }

        public string? BeforeJson { get; set; }

        public string? AfterJson { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }
    }
}
