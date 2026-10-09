using System.ComponentModel.DataAnnotations;

namespace ModelViews.AuthModelView
{
    /// <summary>
    /// Đổi mật khẩu (đã xác thực qua token / session).
    /// </summary>
    public class ChangePasswordModelView
    {
        [Required]
        public Guid UserId { get; set; }

        [Required]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required]
        [MinLength(10)]
        public string NewPassword { get; set; } = string.Empty;

        public string? ConfirmPassword { get; set; }
    }
}
