using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.AttendanceCorrectionModelView
{
    /// <summary>
    /// Trả về chi tiết 1 yêu cầu sửa công (list + detail).
    /// </summary>
    public class AttendanceCorrectionResponseModelView
    {
        public Guid Id { get; set; }

        public Guid EmployeeId { get; set; }
        public string? EmployeeCode { get; set; }
        public string? EmployeeName { get; set; }

        public Guid? AttendanceId { get; set; }

        public DateTime WorkDate { get; set; }

        // Giá trị đề nghị (snapshot)
        public DateTimeOffset? ProposedCheckIn { get; set; }
        public DateTimeOffset? ProposedCheckOut { get; set; }
        public AttendanceStatus? ProposedStatus { get; set; }

        public string? Reason { get; set; }

        // Kết quả duyệt
        public AttendanceCorrectionStatus Status { get; set; }
        public Guid? ReviewedBy { get; set; }
        public string? ReviewerName { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? ReviewNote { get; set; }

        // Audit snapshot (JSON)
        public string? BeforeJson { get; set; }
        public string? AfterJson { get; set; }

        public DateTimeOffset CreatedTime { get; set; }
        public string? CreatedBy { get; set; }
    }


    /// <summary>
    /// Tạo yêu cầu sửa công (nhân viên gửi khi quên chấm / chấm sai).
    /// </summary>
    public class CreateAttendanceCorrectionModelView
    {
        [Required]
        public Guid EmployeeId { get; set; }

        public Guid? AttendanceId { get; set; }

        [Required]
        public DateTime WorkDate { get; set; }

        // Giá trị đề nghị
        public DateTimeOffset? ProposedCheckIn { get; set; }
        public DateTimeOffset? ProposedCheckOut { get; set; }
        public AttendanceStatus? ProposedStatus { get; set; }

        [MaxLength(500)]
        public string? Reason { get; set; }
    }


    /// <summary>
    /// Duyệt / từ chối yêu cầu sửa công (HR / admin).
    /// </summary>
    public class ReviewAttendanceCorrectionModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public AttendanceCorrectionStatus Status { get; set; }

        [Required]
        public Guid ReviewedBy { get; set; }

        [MaxLength(500)]
        public string? ReviewNote { get; set; }
    }
}
