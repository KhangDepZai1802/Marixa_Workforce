using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.AttendanceModelView
{
    public class AttendanceResponseModelView
    {
        public Guid Id { get; set; }

        public Guid EmployeeId { get; set; }

        public string? EmployeeCode { get; set; }

        public string? EmployeeName { get; set; }

        public DateTime AttendanceDate { get; set; }

        public AttendanceStatus? Status { get; set; }

        // Kế hoạch
        public Guid? PlannedShiftId { get; set; }
        public string? PlannedShiftName { get; set; }
        public int? PlannedHours { get; set; }
        public int? ActualHours { get; set; }

        // Số giờ tăng ca (net, tính theo AttendanceRule: phần vượt mốc ra ca chuẩn)
        public decimal? OvertimeHours { get; set; }

        // Giờ thực tế (chấm giờ nào, về giờ đó)
        public DateTimeOffset? CheckInTime { get; set; }
        public DateTimeOffset? CheckOutTime { get; set; }

        // Ảnh
        public string? CheckInPhoto { get; set; }
        public string? CheckOutPhoto { get; set; }

        // Phê duyệt
        public AttendanceApprovalStatus ApprovalStatus { get; set; }
        public Guid? ApprovedBy { get; set; }
        public string? ApproverName { get; set; }
        public DateTime? ApprovedAt { get; set; }

        public string? Note { get; set; }

        // Audit trail: tóm tắt nội dung đã sửa
        public string? ChangeSummary { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public string? LastUpdatedBy { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreateAttendanceModelView
    {
        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public DateTime AttendanceDate { get; set; }

        public AttendanceStatus? Status { get; set; }

        // Kế hoạch (tùy chọn khi tạo)
        public Guid? PlannedShiftId { get; set; }
        public int? PlannedHours { get; set; }


        // Gio vao / ra ca (tuy chon khi tao)
        public DateTimeOffset? CheckInTime { get; set; }
        public DateTimeOffset? CheckOutTime { get; set; }
        public string? Note { get; set; }
    }


    public class UpdateAttendanceModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public DateTime AttendanceDate { get; set; }

        public AttendanceStatus? Status { get; set; }

        public Guid? PlannedShiftId { get; set; }
        public int? PlannedHours { get; set; }
        public int? ActualHours { get; set; }

        // Số giờ tăng ca (net, tính theo AttendanceRule: phần vượt mốc ra ca chuẩn)
        public decimal? OvertimeHours { get; set; }

        // Giờ vào / ra ca (manual override)
        public DateTimeOffset? CheckInTime { get; set; }
        public DateTimeOffset? CheckOutTime { get; set; }

        public string? CheckInPhoto { get; set; }
        public string? CheckOutPhoto { get; set; }

        public AttendanceApprovalStatus ApprovalStatus { get; set; }
        public Guid? ApprovedBy { get; set; }
        public DateTime? ApprovedAt { get; set; }

        public string? Note { get; set; }
    }

    // Bản ghi phê duyệt nhanh (approve / reject)
    public class ApproveAttendanceModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public AttendanceApprovalStatus ApprovalStatus { get; set; }

        [Required]
        public Guid ApprovedBy { get; set; }

        [Required]
        public AttendanceStatus? Status { get; set; }

        public string? Note { get; set; }
    }

    // === Chấm công thực tế (VÀO CA / RA CA) ===

    /// <summary>
    /// Chấm công nhanh: thêm log vào/ra ca cho ngày hiện tại,
    /// tự tạo bản ghi Attendance của ngày nếu chưa có.
    /// </summary>
    public class CheckInAttendanceModelView
    {
        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public AttendanceLogType Type { get; set; }

        public AttendanceMethod Method { get; set; } = AttendanceMethod.Phone;

        [MaxLength(500)]
        public string? PhotoUrl { get; set; }

        public string? Note { get; set; }
    }

    /// <summary>
    /// Kết quả chấm công: Attendance cập nhật + cờ đã có log trùng.
    /// </summary>
    public class CheckInAttendanceResponseModelView
    {
        public bool AlreadyRecorded { get; set; }

        public string? Message { get; set; }

        public AttendanceResponseModelView? Attendance { get; set; }
    }
}
