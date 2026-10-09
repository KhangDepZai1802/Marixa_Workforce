using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.AttendanceLogModelView
{
    public class AttendanceLogResponseModelView
    {
        public Guid Id { get; set; }

        public Guid AttendanceId { get; set; }

        public Guid EmployeeId { get; set; }

        public string? EmployeeName { get; set; }

        public DateTimeOffset LogTime { get; set; }

        public AttendanceLogType Type { get; set; }

        public AttendanceMethod Method { get; set; }

        public string? PhotoUrl { get; set; }

        public decimal? Latitude { get; set; }

        public decimal? Longitude { get; set; }

        public string? DeviceId { get; set; }

        public string? Note { get; set; }

        // Điều chỉnh / ngoại lệ
        public bool IsAdjusted { get; set; }
        public string? AdjustedBy { get; set; }
        public DateTimeOffset? AdjustedAt { get; set; }
        public string? AdjustmentNote { get; set; }

        public DateTimeOffset CreatedTime { get; set; }
    }


    public class CreateAttendanceLogModelView
    {
        [Required]
        public Guid AttendanceId { get; set; }

        [Required]
        public DateTimeOffset LogTime { get; set; }

        [Required]
        public AttendanceLogType Type { get; set; }

        [Required]
        public AttendanceMethod Method { get; set; }

        [MaxLength(500)]
        public string? PhotoUrl { get; set; }

        public decimal? Latitude { get; set; }

        public decimal? Longitude { get; set; }

        [MaxLength(100)]
        public string? DeviceId { get; set; }

        public string? Note { get; set; }
    }


    public class UpdateAttendanceLogModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public Guid AttendanceId { get; set; }

        [Required]
        public DateTimeOffset LogTime { get; set; }

        [Required]
        public AttendanceLogType Type { get; set; }

        [Required]
        public AttendanceMethod Method { get; set; }

        [MaxLength(500)]
        public string? PhotoUrl { get; set; }

        public decimal? Latitude { get; set; }

        public decimal? Longitude { get; set; }

        [MaxLength(100)]
        public string? DeviceId { get; set; }

        public string? Note { get; set; }
    }

    // Bản ghi xử lý ngoại lệ (điều chỉnh quên chấm / chấm sai)
    public class AdjustAttendanceLogModelView
    {
        [Required]
        public Guid Id { get; set; }

        public string? PhotoUrl { get; set; }

        public decimal? Latitude { get; set; }

        public decimal? Longitude { get; set; }

        public string? Note { get; set; }

        [Required]
        public string AdjustedNote { get; set; } = string.Empty;
    }
}
