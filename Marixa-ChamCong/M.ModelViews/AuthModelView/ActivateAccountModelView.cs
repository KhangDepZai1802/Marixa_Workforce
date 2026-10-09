using System.ComponentModel.DataAnnotations;

namespace ModelViews.AuthModelView
{
    /// <summary>
    /// Kích hoạt tài khoản bằng mã kích hoạt (quy trình bàn giao:
    /// nhân viên nhận mã, đặt mật khẩu mới, kích hoạt tài khoản).
    /// Mật khẩu yêu cầu tối thiểu 10 ký tự, có chữ hoa, chữ thường,
    /// chữ số và ký tự đặc biệt.
    /// </summary>
    public class ActivateAccountModelView
    {
        [Required]
        [MaxLength(50)]
        public string Code { get; set; } = string.Empty;

        [Required]
        [MinLength(10)]
        public string Password { get; set; } = string.Empty;

        public string? ConfirmPassword { get; set; }
    }
}
