using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    /// <summary>
    /// Yêu cầu SỬA CÔNG (attendance correction). Nhân viên quên chấm / chấm sai
    /// không sửa trực tiếp event gốc (chống tam tống), mà tạo yêu cầu riêng;
    /// HR/admin duyệt sẽ ghi snapshot trước/sau để truy vết (quyết định V1:
    /// "yêu cầu sửa công" — "không sửa event gốc; lưu snapshot dữ liệu đề
    /// nghị và dữ liệu trước/sau trong audit").
    /// </summary>
    public class AttendanceCorrection : BaseEntity
    {
        // Nhân viên gửi yêu cầu sửa
        [Required]
        public Guid EmployeeId { get; set; }

        [ForeignKey(nameof(EmployeeId))]
        public virtual Employee? Employee { get; set; }

        // Bản ghi chấm công liên quan (nếu có)
        public Guid? AttendanceId { get; set; }

        [ForeignKey(nameof(AttendanceId))]
        public virtual Attendance? Attendance { get; set; }

        // Ngày công cần sửa
        [Required]
        public DateTime WorkDate { get; set; }

        // =========================================================
        // GIÁ TRỊ ĐỀ NGHỊ (snapshot) — giữ nguyên, không ghi đè
        // =========================================================

        // Giờ vào đề nghị
        public DateTimeOffset? ProposedCheckIn { get; set; }

        // Giờ ra đề nghị
        public DateTimeOffset? ProposedCheckOut { get; set; }

        // Trạng thái chấm công đề nghị (nếu có)
        public AttendanceStatus? ProposedStatus { get; set; }

        // Lý do
        [MaxLength(500)]
        public string? Reason { get; set; }

        // =========================================================
        // KẾT QUẢ DUYỆT
        // =========================================================

        // Trạng thái duyệt
        [Required]
        public AttendanceCorrectionStatus Status { get; set; }
            = AttendanceCorrectionStatus.Pending;

        // Người duyệt (Employee.Id)
        public Guid? ReviewedBy { get; set; }

        [ForeignKey(nameof(ReviewedBy))]
        public virtual Employee? Reviewer { get; set; }

        // Thời điểm duyệt
        public DateTime? ReviewedAt { get; set; }

        // Ghi chú khi duyệt
        [MaxLength(500)]
        public string? ReviewNote { get; set; }

        // =========================================================
        // AUDIT: DỮ LIỆU TRƯỚC / SAU (JSON snapshot)
        // =========================================================

        // Snapshot giá trị TRƯỚC khi sửa (JSON)
        [Column(TypeName = "text")]
        public string? BeforeJson { get; set; }

        // Snapshot giá trị SAU khi sửa (JSON)
        [Column(TypeName = "text")]
        public string? AfterJson { get; set; }
    }

    public enum AttendanceCorrectionStatus
    {
        Pending = 1,
        Approved = 2,
        Rejected = 3,
        Cancelled = 4
    }
}
