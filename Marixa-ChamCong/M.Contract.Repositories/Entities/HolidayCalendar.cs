using M.Core.Base;
using System.ComponentModel.DataAnnotations;

namespace M.Contract.Repositories.Entities
{
    /// <summary>
    /// Lịch lễ, ngày nghỉ và ngày làm bù chung toàn công ty.
    /// </summary>
    public class HolidayCalendar : BaseEntity
    {
        // Ngày (lễ / nghỉ / làm bù)
        [Required]
        public DateTime Date { get; set; }

        // Năm áp dụng (để tổ chức theo năm)
        [Required]
        public int Year { get; set; }

        // Loại ngày
        [Required]
        public HolidayType Type { get; set; }

        // Tên / mô tả (ví dụ: Quốc khánh, Tết, Ngày lễ...)
        public string? Name { get; set; }

        // Cờ kích hoạt
        public bool IsActive { get; set; } = true;
    }

    /// <summary>
    /// Các loại ngày trong lịch chấm công.
    /// </summary>
    public enum HolidayType
    {
        Holiday = 1,      // Ngày lễ (nghỉ)
        PublicHoliday = 2, // Ngày lễ quốc gia
        MakeUpWork = 3,   // Ngày làm bù (thường là thứ 7/Chủ nhật làm bù)
        SpecialOff = 4     // Ngày nghỉ đặc biệt theo công ty
    }
}
