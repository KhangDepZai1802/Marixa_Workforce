using M.Core.Base;
using System.ComponentModel.DataAnnotations;

namespace M.Contract.Repositories.Entities
{
    /// <summary>
    /// Quy tắc chấm công dùng để tính kế hoạch / tự động hoá:
    /// mốc giờ vào - ra chuẩn, dung sai đi trễ, ngưỡng về sớm,
    /// yêu cầu ảnh và định vị GPS khi chấm công.
    /// </summary>
    public class AttendanceRule : BaseEntity
    {
        // Mã quy tắc
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        // Tên quy tắc
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        // Mô tả
        public string? Description { get; set; }

        // Số giờ làm chuẩn mỗi ngày (mặc định 8h)
        public int StandardHours { get; set; } = 8;

        // Giờ vào ca chuẩn (mặc định 08:00)
        public TimeOnly CheckInTime { get; set; } = new TimeOnly(8, 0);

        // Giờ ra ca chuẩn (mặc định 16:30)
        public TimeOnly CheckOutTime { get; set; } = new TimeOnly(16, 30);

        // Dung sai đi trễ (phút) — quá mốc này sẽ đánh Late
        public int LateGraceMinutes { get; set; } = 0;

        // Ngưỡng về sớm (phút) — về sớm quá mốc này sẽ đánh EarlyLeave
        public int EarlyLeaveThresholdMinutes { get; set; } = 0;

        // Số phút nghỉ giữa ca được trừ (0 = không trừ)
        public int BreakMinutes { get; set; } = 0;

        // Bắt buộc chụp ảnh khi chấm công (mỗi lần)
        public bool PhotoRequired { get; set; } = true;

        // Bắt buộc định vị GPS khi chấm công
        public bool GpsRequired { get; set; } = false;

        // Cờ kích hoạt
        public bool IsActive { get; set; } = true;
    }
}
