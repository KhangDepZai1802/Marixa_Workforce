using M.Contract.Repositories.Entities;
using ModelViews.EmployeeModelView;
using System.ComponentModel.DataAnnotations;

namespace ModelViews.UserModelView
{
    public class CreateUserModelView
    {
        [Required]
        [MaxLength(50)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [MinLength(6)]
        [MaxLength(100)]
        public string Password { get; set; } = string.Empty;

        [EmailAddress]
        [MaxLength(150)]
        public string Email { get; set; } = string.Empty;

        [MaxLength(50)]
        public string Role { get; set; } = "User";

        // Thông tin nhân viên (tuỳ chọn) - nếu null, service sẽ tự tạo Employee mặc định
        public CreateEmployeeModelView? CreateEmployeeModelView { get; set; }
    }
}