using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    public class AttendanceLog : BaseEntity
    {
        // Khóa ngoại tới bản ghi Attendance
        [Required]
        public Guid AttendanceId { get; set; }

        // Điều hướng tới Attendance
        [ForeignKey(nameof(AttendanceId))]
        public virtual Attendance? Attendance { get; set; }

        // Thời gian log (với timezone)
        [Required]
        public DateTimeOffset LogTime { get; set; }

        // Loại log: vào / ra
        [Required]
        public AttendanceLogType Type { get; set; }

        // Phương thức chấm công (điện thoại, vân tay, GPS...)
        public AttendanceMethod Method { get; set; }

        // Ảnh chụp tại thời điểm chấm (URL / đường dẫn lưu)
        [MaxLength(500)]
        public string? PhotoUrl { get; set; }

        // Tọa độ (nếu có) lưu ở dạng decimal với độ chính xác
        [Column(TypeName = "decimal(10,7)")]
        public decimal? Latitude { get; set; }
        [Column(TypeName = "decimal(10,7)")]
        public decimal? Longitude { get; set; }

        // Mã thiết bị (nếu có)
        [MaxLength(100)]
        public string? DeviceId { get; set; }

        // Ghi chú thêm
        public string? Note { get; set; }

        // =========================================================
        // XỬ LÝ NGOẠI LỆ (quên chấm / chấm sai được điều chỉnh)
        // =========================================================

        // Log có bị điều chỉnh / xử lý ngoại lệ hay không
        public bool IsAdjusted { get; set; } = false;

        // Người điều chỉnh (username) — khác với CreatedBy (thời điểm tạo)
        public string? AdjustedBy { get; set; }

        // Thời điểm điều chỉnh
        public DateTimeOffset? AdjustedAt { get; set; }

        // Ghi chú điều chỉnh (lý do)
        public string? AdjustmentNote { get; set; }
    }

    // Kiểu log: CheckIn hoặc CheckOut
    public enum AttendanceLogType
    {
        CheckIn = 1,
        CheckOut = 2
    }

    // Các phương thức thực hiện chấm công
    public enum AttendanceMethod
    {
        Manual = 1,
        Fingerprint = 2,
        FaceRecognition = 3,
        Phone = 4,
        GPS = 5,
        Import = 6
    }
}
