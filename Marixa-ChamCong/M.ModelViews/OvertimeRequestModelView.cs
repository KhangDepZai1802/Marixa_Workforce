using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.OvertimeRequestModelView
{
    /// <summary>
    /// Trả về chi tiết 1 yêu cầu tăng ca (dùng cho list + detail).
    /// </summary>
    public class OvertimeRequestResponseModelView
    {
        public Guid Id { get; set; }

        public Guid EmployeeId { get; set; }
        public string? EmployeeCode { get; set; }
        public string? EmployeeName { get; set; }

        public Guid? AttendanceId { get; set; }

        public DateTime WorkDate { get; set; }

        public DateTimeOffset? StartAt { get; set; }
        public DateTimeOffset? EndAt { get; set; }
        public decimal? OvertimeHours { get; set; }

        public string? Reason { get; set; }

        public OvertimeStatus Status { get; set; }
        public Guid? ApprovedBy { get; set; }
        public string? ApproverName { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? Note { get; set; }

        public DateTimeOffset CreatedTime { get; set; }
        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    /// <summary>
    /// Tạo mới yêu cầu tăng ca (nhân viên tự đề xuất).
    /// </summary>
    public class CreateOvertimeRequestModelView
    {
        [Required]
        public Guid EmployeeId { get; set; }

        public Guid? AttendanceId { get; set; }

        [Required]
        public DateTime WorkDate { get; set; }

        public DateTimeOffset? StartAt { get; set; }
        public DateTimeOffset? EndAt { get; set; }
        public decimal? OvertimeHours { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }
    }


    /// <summary>
    /// Cập nhật yêu cầu tăng ca (chỉ khi còn Pending).
    /// </summary>
    public class UpdateOvertimeRequestModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        public Guid? AttendanceId { get; set; }

        [Required]
        public DateTime WorkDate { get; set; }

        public DateTimeOffset? StartAt { get; set; }
        public DateTimeOffset? EndAt { get; set; }
        public decimal? OvertimeHours { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }
    }


    /// <summary>
    /// Duyệt / từ chối yêu cầu tăng ca.
    /// </summary>
    public class ReviewOvertimeRequestModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public OvertimeStatus Status { get; set; }

        [Required]
        public Guid ApprovedBy { get; set; }

        [MaxLength(500)]
        public string? Note { get; set; }
    }
}
