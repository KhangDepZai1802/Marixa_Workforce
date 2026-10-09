using System.ComponentModel.DataAnnotations;

namespace ModelViews.PositionModelView
{
    public class PositionResponseModelView
    {
        public Guid Id { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public bool IsActive { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreatePositionModelView
    {
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public bool IsActive { get; set; } = true;
    }


    public class UpdatePositionModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public bool IsActive { get; set; }
    }
}