using System.ComponentModel.DataAnnotations;

namespace ModelViews.LeaveTypeModelView
{
    public class LeaveTypeResponseModelView
    {
        public Guid Id { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public decimal? MaxDays { get; set; }

        public bool IsPaid { get; set; }

        public bool IsActive { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreateLeaveTypeModelView
    {
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public decimal? MaxDays { get; set; }

        public bool IsPaid { get; set; } = true;

        public bool IsActive { get; set; } = true;
    }


    public class UpdateLeaveTypeModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        public string Name { get; set; } = string.Empty;

        public decimal? MaxDays { get; set; }

        public bool IsPaid { get; set; }

        public bool IsActive { get; set; }
    }
}