using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.OfficeLocationModelView
{
    /// <summary>
    /// Trả về chi tiết 1 địa điểm văn phòng (list + detail).
    /// </summary>
    public class OfficeLocationResponseModelView
    {
        public Guid Id { get; set; }

        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }

        public int? RadiusMeters { get; set; }

        public bool IsPrimary { get; set; }
        public bool IsActive { get; set; }

        public DateTimeOffset CreatedTime { get; set; }
        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    /// <summary>
    /// Tạo địa điểm văn phòng (admin).
    /// </summary>
    public class CreateOfficeLocationModelView
    {
        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }

        public int? RadiusMeters { get; set; }

        public bool IsPrimary { get; set; } = false;
        public bool IsActive { get; set; } = true;
    }


    /// <summary>
    /// Cập nhật địa điểm văn phòng (admin).
    /// </summary>
    public class UpdateOfficeLocationModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Description { get; set; }

        public decimal? Latitude { get; set; }
        public decimal? Longitude { get; set; }

        public int? RadiusMeters { get; set; }

        public bool IsPrimary { get; set; }
        public bool IsActive { get; set; }
    }
}
