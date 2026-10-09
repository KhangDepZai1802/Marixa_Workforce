using M.Contract.Repositories.Entities;
using M.Core.Base;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace M.Contract.Repositories.Entity
{
    /// <summary>
    /// Mã kích hoạt tài khoản (chạy một lần, có thời hạn mặc định 24h).
    /// Dùng trong quy trình bàn giao: cấp mã kích hoạt cho nhân viên
    /// để nhân viên đặt mật khẩu và kích hoạt tài khoản.
    /// </summary>
    public class ActivationCode : BaseEntity
    {
        // Mã kích hoạt (bắt buộc, duy nhất)
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        // Khóa ngoại tới nhân viên (bắt buộc)
        [Required]
        public Guid EmployeeId { get; set; }

        [ForeignKey(nameof(EmployeeId))]
        public virtual Employee? Employee { get; set; }

        // Khóa ngoại tới tài khoản user (nếu đã có user)
        public Guid? UserId { get; set; }

        [ForeignKey(nameof(UserId))]
        public virtual ApplicationUser? User { get; set; }

        // Thời điểm hết hạn (mặc định +24h kể từ khi tạo)
        [Required]
        public DateTime ExpiresAt { get; set; }

        // Thời điểm mã được sử dụng (null = chưa dùng)
        public DateTime? UsedAt { get; set; }

        // Người đã kích hoạt (username)
        public string? ActivatedBy { get; set; }

        // Trạng thái mã
        public bool IsUsed { get; set; } = false;
    }
}
