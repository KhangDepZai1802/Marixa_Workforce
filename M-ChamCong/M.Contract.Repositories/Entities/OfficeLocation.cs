using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    /// <summary>
    /// Địa điểm văn phòng tham chiếu GPS (office location). Admin cấu hình
    /// tọa độ + bán kính; chấm công đối chiếu vị trí và gắn cờ khi ngoài văn
    /// phòng (quy định V1: "Ảnh và GPS bắt buộc; ngoài văn phòng vẫn nhận và
    /// gắn cờ"). V1 có thể có một văn phòng, schema cho phép nhiều.
    /// </summary>
    public class OfficeLocation : BaseEntity
    {
        // Tên địa điểm (ví dụ: Văn phòng chính)
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        // Ghi chú
        [MaxLength(500)]
        public string? Description { get; set; }

        // Tọa độ
        [Column(TypeName = "decimal(10,7)")]
        public decimal? Latitude { get; set; }

        [Column(TypeName = "decimal(10,7)")]
        public decimal? Longitude { get; set; }

        // Bán kính cho phép (mét)
        public int? RadiusMeters { get; set; }

        // Có phải địa điểm chính (mặc định dùng khi chưa gán địa điểm cụ thể)
        public bool IsPrimary { get; set; } = true;

        // Cờ kích hoạt
        public bool IsActive { get; set; } = true;
    }
}
