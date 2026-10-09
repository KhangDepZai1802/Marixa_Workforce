using M.Core.Base;
using System.ComponentModel.DataAnnotations;

namespace M.Contract.Repositories.Entities
{
    /// <summary>
    /// Ca làm việc (shift) dùng cho chấm công kế hoạch.
    /// </summary>
    public class Shift : BaseEntity
    {
        // Mã ca
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        // Tên ca (ví dụ: Ca hành chính 08:00 - 16:30)
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        // Mô tả ca
        public string? Description { get; set; }

        // Giờ bắt đầu ca
        public TimeOnly StartTime { get; set; }

        // Giờ kết thúc ca
        public TimeOnly EndTime { get; set; }

        // Số giờ làm chuẩn trong ca (mặc định 8h)
        public int StandardHours { get; set; } = 8;

        // Số phút nghỉ giữa ca (0 = không trừ)
        public int BreakMinutes { get; set; } = 0;

        // Có phải ca đêm không
        public bool IsNight { get; set; } = false;

        // Ngày trong tuần áp dụng (bitmask: 1=T2,2=T3,4=T4,8=T5,16=T6,32=T7,64=CN).
        // Mặc định thứ 2 - thứ 6 = 31.
        public int WorkDays { get; set; } = 31;

        // Cờ kích hoạt
        public bool IsActive { get; set; } = true;

        // Danh sách gán ca của nhân viên
        public virtual ICollection<EmployeeShift> EmployeeShifts { get; set; }
            = new List<EmployeeShift>();
    }
}
