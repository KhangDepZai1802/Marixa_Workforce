using System.ComponentModel.DataAnnotations;

namespace ModelViews.DepartmentModelView
{
    public class DepartmentResponseModelView
    {
        public Guid Id { get; set; }

        public string Code { get; set; } = string.Empty;

        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public Guid? ManagerId { get; set; }

        public string? ManagerName { get; set; }

        public bool IsActive { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreateDepartmentModelView
    {
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        public string Name { get; set; } = string.Empty;

        public string? Description { get; set; }

        public Guid? ManagerId { get; set; }

        public bool IsActive { get; set; } = true;
    }


    public class UpdateDepartmentModelView
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

        public Guid? ManagerId { get; set; }

        public bool IsActive { get; set; }
    }
}