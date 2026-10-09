using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.ShiftModelView
{
    public class ShiftResponseModelView
    {
        public Guid Id { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public TimeOnly StartTime { get; set; }

        public TimeOnly EndTime { get; set; }

        public int StandardHours { get; set; }

        public int BreakMinutes { get; set; }

        public bool IsNight { get; set; }

        public int WorkDays { get; set; }

        public bool IsActive { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreateShiftModelView
    {
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public TimeOnly StartTime { get; set; }

        public TimeOnly EndTime { get; set; }

        public int StandardHours { get; set; } = 8;

        public int BreakMinutes { get; set; } = 0;

        public bool IsNight { get; set; }

        public int WorkDays { get; set; } = 31;

        public bool IsActive { get; set; } = true;
    }


    public class UpdateShiftModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public TimeOnly StartTime { get; set; }

        public TimeOnly EndTime { get; set; }

        public int StandardHours { get; set; }

        public int BreakMinutes { get; set; }

        public bool IsNight { get; set; }

        public int WorkDays { get; set; }

        public bool IsActive { get; set; }
    }
}
