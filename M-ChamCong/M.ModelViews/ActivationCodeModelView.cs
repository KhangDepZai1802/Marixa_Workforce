using M.Contract.Repositories.Entity;
using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.ActivationCodeModelView
{
    public class ActivationCodeResponseModelView
    {
        public Guid Id { get; set; }

        public string Code { get; set; } = string.Empty;

        public Guid EmployeeId { get; set; }

        public string? EmployeeName { get; set; }

        public Guid? UserId { get; set; }

        public DateTime ExpiresAt { get; set; }

        public DateTime? UsedAt { get; set; }

        public string? ActivatedBy { get; set; }

        public string? CreatedBy { get; set; }

        public bool IsUsed { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreateActivationCodeModelView
    {
        [Required]
        public Guid EmployeeId { get; set; }

        // Thời hạn (phút). Mặc định 72h = 4320.
        public int? ValidMinutes { get; set; }

        [Required]
        [MinLength(6)]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;
    }


    public class UpdateActivationCodeModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        [MinLength(6)]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        public DateTime? ExpiresAt { get; set; }
    }

    public class VerifyEmployeeActivationModelView
    {
        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        [MinLength(6)]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;
    }
}
