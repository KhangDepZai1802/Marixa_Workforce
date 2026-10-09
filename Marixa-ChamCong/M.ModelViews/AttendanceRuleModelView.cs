using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.AttendanceRuleModelView
{
    public class AttendanceRuleResponseModelView
    {
        public Guid Id { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public int StandardHours { get; set; }

        public TimeOnly CheckInTime { get; set; }

        public TimeOnly CheckOutTime { get; set; }

        public int LateGraceMinutes { get; set; }

        public int EarlyLeaveThresholdMinutes { get; set; }

        public int BreakMinutes { get; set; }

        public bool PhotoRequired { get; set; }

        public bool GpsRequired { get; set; }

        public bool IsActive { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreateAttendanceRuleModelView
    {
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public int StandardHours { get; set; } = 8;

        public TimeOnly CheckInTime { get; set; } = new TimeOnly(8, 0);

        public TimeOnly CheckOutTime { get; set; } = new TimeOnly(16, 30);

        public int LateGraceMinutes { get; set; } = 0;

        public int EarlyLeaveThresholdMinutes { get; set; } = 0;

        public int BreakMinutes { get; set; } = 0;

        public bool PhotoRequired { get; set; } = true;

        public bool GpsRequired { get; set; }

        public bool IsActive { get; set; } = true;
    }


    public class UpdateAttendanceRuleModelView
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

        public int StandardHours { get; set; }

        public TimeOnly CheckInTime { get; set; }

        public TimeOnly CheckOutTime { get; set; }

        public int LateGraceMinutes { get; set; }

        public int EarlyLeaveThresholdMinutes { get; set; }

        public int BreakMinutes { get; set; }

        public bool PhotoRequired { get; set; }

        public bool GpsRequired { get; set; }

        public bool IsActive { get; set; }
    }
}
