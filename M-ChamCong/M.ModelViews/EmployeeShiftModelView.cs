using M.Contract.Repositories.Entities;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.EmployeeShiftModelView
{
    public class EmployeeShiftResponseModelView
    {
        public Guid Id { get; set; }

        public Guid EmployeeId { get; set; }

        public string? EmployeeName { get; set; }

        public Guid ShiftId { get; set; }

        public string? ShiftName { get; set; }

        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        public string? Note { get; set; }

        public DateTimeOffset CreatedTime { get; set; }

        public DateTimeOffset LastUpdatedTime { get; set; }
    }


    public class CreateEmployeeShiftModelView
    {
        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public Guid ShiftId { get; set; }

        [Required]
        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        public string? Note { get; set; }
    }

    public class CreateEmployeeShiftBulkModelView
    {
        [Required]
        [MinLength(2)]
        public List<Guid> EmployeeIds { get; set; } = new();

        [Required]
        public Guid ShiftId { get; set; }

        [Required]
        public DateTime EffectiveFrom { get; set; }

        [Required]
        public DateTime EffectiveTo { get; set; }

        public string? Note { get; set; }
    }

    public class CreateEmployeeShiftBulkResultModelView
    {
        public int CreatedAssignmentCount { get; set; }

        public int AssignedEmployeeCount { get; set; }

        public int AlreadyAssignedCount { get; set; }

        public List<string> AlreadyAssignedEmployeeNames { get; set; } = new();
    }


    public class UpdateEmployeeShiftModelView
    {
        [Required]
        public Guid Id { get; set; }

        [Required]
        public Guid EmployeeId { get; set; }

        [Required]
        public Guid ShiftId { get; set; }

        [Required]
        public DateTime EffectiveFrom { get; set; }

        public DateTime? EffectiveTo { get; set; }

        public string? Note { get; set; }
    }
}
