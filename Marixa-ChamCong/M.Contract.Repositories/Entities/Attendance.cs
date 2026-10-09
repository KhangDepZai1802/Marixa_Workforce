using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    public class Attendance : BaseEntity
    {
        // Khóa ngoại tới nhân viên (bắt buộc)
        [Required]
        public Guid EmployeeId { get; set; }

        // Điều hướng tới đối tượng Employee
        [ForeignKey(nameof(EmployeeId))]
        public virtual Employee? Employee { get; set; }

        // Ngày chấm công (bắt buộc)
        [Required]
        public DateTime AttendanceDate { get; set; }

        // Trạng thái chấm công (có thể null nếu chưa xác định)
        public AttendanceStatus? Status { get; set; }

        // =========================================================
        // GIỜ VÀO / RA CA (manual override khi admin chỉnh sửa)
        // Nếu null, mapping sẽ derive từ AttendanceLog.
        // =========================================================
        public DateTimeOffset? CheckInTime { get; set; }
        public DateTimeOffset? CheckOutTime { get; set; }

        // Tóm tắt nội dung đã sửa (audit trail)
        [MaxLength(500)]
        public string? ChangeSummary { get; set; }

        // =========================================================
        // KẾ HOẠCH (chấm công kế hoạch)
        // =========================================================

        // Ca được gán kế hoạch cho ngày này (nếu có)
        public Guid? PlannedShiftId { get; set; }

        [ForeignKey(nameof(PlannedShiftId))]
        public virtual Shift? PlannedShift { get; set; }

        // Số giờ làm kỳ vọng theo ca
        public int? PlannedHours { get; set; }

        // Số giờ làm thực tế (net: đã trừ giờ nghỉ giữa ca theo AttendanceRule)
        public int? ActualHours { get; set; }

        // Số giờ tăng ca (phần vượt mốc ra ca chuẩn). Transient: tính ở service,
        // KHÔNG lưu DB (tránh migration / lệch schema) — tính lại khi cần.
        [NotMapped]
        public decimal? OvertimeHours { get; set; }

        // =========================================================
        // ẢNH CHỤP KHI CHẤM CÔNG (có thể null nếu chấm không kèm ảnh)
        // =========================================================

        // Ảnh khi vào ca (URL / đường dẫn lưu)
        [MaxLength(500)]
        public string? CheckInPhoto { get; set; }

        // Ảnh khi ra ca (URL / đường dẫn lưu)
        [MaxLength(500)]
        public string? CheckOutPhoto { get; set; }

        // =========================================================
        // PHÊ DUYỆT NGÀY CÔNG
        // =========================================================

        // Trạng thái phê duyệt (mặc định Pending)
        [Required]
        public AttendanceApprovalStatus ApprovalStatus { get; set; }
            = AttendanceApprovalStatus.Pending;

        // Người phê duyệt (Employee.Id)
        public Guid? ApprovedBy { get; set; }

        [ForeignKey(nameof(ApprovedBy))]
        public virtual Employee? Approver { get; set; }

        // Thời điểm phê duyệt
        public DateTime? ApprovedAt { get; set; }

        // Ghi chú thêm
        public string? Note { get; set; }

        // Danh sách các bản ghi log chấm công liên quan
        public virtual ICollection<AttendanceLog> AttendanceLogs { get; set; }
            = new List<AttendanceLog>();
    }

    // Các trạng thái chấm công được hỗ trợ
    public enum AttendanceStatus
    {
        Present = 1,
        Late = 2,
        EarlyLeave = 3,
        Absent = 4,
        Leave = 5,
        Holiday = 6,
        Weekend = 7
    }

    // Trạng thái phê duyệt ngày công
    public enum AttendanceApprovalStatus
    {
        Pending = 0,
        Approved = 1,
        Rejected = 2
    }
}
