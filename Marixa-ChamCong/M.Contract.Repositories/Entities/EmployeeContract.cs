using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entities
{
    public class EmployeeContract : BaseEntity
    {
        // Khóa ngoại tới nhân viên
        [Required]
        public Guid EmployeeId { get; set; }

        // Điều hướng tới Employee
        [ForeignKey(nameof(EmployeeId))]
        public virtual Employee? Employee { get; set; }

        // Số hợp đồng, bắt buộc
        [Required]
        [MaxLength(100)]
        public string ContractNumber { get; set; } = string.Empty;

        // Loại hợp đồng
        [Required]
        public ContractType ContractType { get; set; }

        // Ngày bắt đầu hợp đồng
        [Required]
        public DateTime StartDate { get; set; }

        // Ngày kết thúc (nếu có)
        public DateTime? EndDate { get; set; }

        // Ghi chú
        public string? Note { get; set; }
    }

    // Các loại hợp đồng
    public enum ContractType
    {
        Probation = 1,
        FixedTerm = 2,
        IndefiniteTerm = 3,
        Seasonal = 4
    }
}
